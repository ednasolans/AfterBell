"""
Set the "Actual Start" date of an issue in the GitHub Project when its branch
is created. Run by the set-actual-start workflow.

The issue number is taken from the branch name, which must contain it followed
by a dash, as in branches created from an issue ("22-c4-whole-year-sheet") or
"feature/22-technical-sheet".

The date is only written if the field is empty, so a date entered by hand is
never overwritten.

Environment variables:
    BRANCH          name of the new branch (from the workflow event)
    REPO            owner/repo
    PROJECT_NUMBER  number of the GitHub Project
    PROJECT_OWNER   owner of the Project (default: owner of the repo)
    GH_TOKEN        token with the project and repo scopes
"""

import json
import os
import re
import subprocess
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

FIELD_NAME = "Actual Start"
TIMEZONE = ZoneInfo("Europe/Madrid")

BRANCH_PATTERN = re.compile(r"[A-Za-z0-9._/-]{1,200}")
ISSUE_IN_BRANCH = re.compile(r"(?:^|/)(\d{1,7})-")
REPO_PATTERN = re.compile(r"([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)")
OWNER_PATTERN = re.compile(r"[A-Za-z0-9][A-Za-z0-9-]{0,38}")

ISSUE_QUERY = """
query($owner: String!, $name: String!, $number: Int!, $field: String!) {
  repository(owner: $owner, name: $name) {
    issue(number: $number) {
      projectItems(first: 20) {
        nodes {
          id
          project {
            id
            number
            owner { ... on User { login } ... on Organization { login } }
            field(name: $field) { ... on ProjectV2Field { id dataType } }
          }
          fieldValueByName(name: $field) {
            ... on ProjectV2ItemFieldDateValue { date }
          }
        }
      }
    }
  }
}
"""

UPDATE_MUTATION = """
mutation($project: ID!, $item: ID!, $field: ID!, $date: Date!) {
  updateProjectV2ItemFieldValue(input: {
    projectId: $project, itemId: $item, fieldId: $field, value: { date: $date }
  }) {
    projectV2Item { id }
  }
}
"""


def graphql(query, **variables):
    arguments = ["gh", "api", "graphql", "-f", f"query={query}"]
    for name, value in variables.items():
        flag = "-F" if isinstance(value, int) else "-f"
        arguments += [flag, f"{name}={value}"]
    result = subprocess.run(arguments, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def finish(message):
    """Nothing to do is not an error: the workflow ends successfully."""
    print(message)
    sys.exit(0)


def main():
    branch = os.environ.get("BRANCH", "")
    repo = os.environ.get("REPO", "")
    project_number = os.environ.get("PROJECT_NUMBER", "")

    if not BRANCH_PATTERN.fullmatch(branch):
        finish(f"Skipped: unexpected branch name {branch!r}.")
    repo_match = REPO_PATTERN.fullmatch(repo)
    if not repo_match:
        sys.exit(f"Invalid REPO: {repo!r}")
    if not project_number.isdigit():
        sys.exit(f"Invalid PROJECT_NUMBER: {project_number!r}")
    owner, name = repo_match.groups()
    project_owner = os.environ.get("PROJECT_OWNER") or owner
    if not OWNER_PATTERN.fullmatch(project_owner):
        sys.exit(f"Invalid PROJECT_OWNER: {project_owner!r}")

    issue_match = ISSUE_IN_BRANCH.search(branch)
    if not issue_match:
        finish(f"Skipped: branch {branch!r} does not contain an issue number.")
    issue_number = int(issue_match.group(1))

    data = graphql(ISSUE_QUERY, owner=owner, name=name, number=issue_number, field=FIELD_NAME)
    issue = (data.get("data", {}).get("repository") or {}).get("issue")
    if issue is None:
        finish(f"Skipped: issue #{issue_number} not found.")

    for item in issue["projectItems"]["nodes"]:
        project = item["project"]
        if project["number"] != int(project_number):
            continue
        if (project.get("owner") or {}).get("login", "").lower() != project_owner.lower():
            continue

        field = project.get("field") or {}
        if field.get("dataType") != "DATE":
            sys.exit(f'The Project has no date field called "{FIELD_NAME}".')

        current = (item.get("fieldValueByName") or {}).get("date")
        if current:
            finish(f"Issue #{issue_number} already has {FIELD_NAME} = {current}: not changed.")

        today = datetime.now(TIMEZONE).date().isoformat()
        graphql(UPDATE_MUTATION, project=project["id"], item=item["id"],
                field=field["id"], date=today)
        finish(f"Issue #{issue_number}: {FIELD_NAME} set to {today}.")

    finish(f"Skipped: issue #{issue_number} is not in Project {project_number}.")


if __name__ == "__main__":
    main()