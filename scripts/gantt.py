"""
Gantt chart of a sprint: planned vs. actual dates of each issue.

For every issue of the milestone it draws:
- the planned bar, from the Project's start date to its target date
- the actual bar, from the actual start date to the date the issue was closed
  (or to today, if it is still open)

Usage:
    python gantt.py --repo ednasolans/AfterBell --milestone "Sprint 1" \
        --start 2026-10-05 --end 2026-10-27 --project-number 1

Requirements: gh (logged in, with the read:project scope) and matplotlib.
"""

import argparse
import json
import logging
import re
import subprocess
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import matplotlib

matplotlib.use("Agg")  # no display needed (also works in GitHub Actions)
import matplotlib.dates as mdates
import matplotlib.pyplot as plt
from matplotlib.patches import Patch

TIMEZONE = ZoneInfo("Europe/Madrid")

# Names of the Project's date fields
PLANNED_START_FIELD = "Start date"
PLANNED_END_FIELD = "Target Date"
ACTUAL_START_FIELD = "Actual Start"

# Allowed values for the command-line arguments (they are passed to gh)
REPO_PATTERN = re.compile(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+")
OWNER_PATTERN = re.compile(r"[A-Za-z0-9][A-Za-z0-9-]{0,38}")
MILESTONE_PATTERN = re.compile(r"[A-Za-z0-9][A-Za-z0-9 _.-]{0,49}")
OUTPUT_PATTERN = re.compile(r"[A-Za-z0-9_.-]+\.png")

FONT_STACK = ["Segoe UI", "Helvetica Neue", "Helvetica", "Noto Sans", "Arial", "DejaVu Sans"]
logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)

THEMES = {
    "light": {
        "background": "#ffffff",
        "text": "#1f2328",
        "muted": "#59636e",
        "grid": "#d9dde3",
        "planned": "#d8d0fb",
        "on_time": "#00c853",
        "late": "#ff6b7a",
        "in_progress": "#f0a500",
        "today": "#e5534b",
    },
    "dark": {
        "background": "#0d1117",
        "text": "#f0f6fc",
        "muted": "#9198a1",
        "grid": "#3d444d",
        "planned": "#3b3266",
        "on_time": "#3fb950",
        "late": "#ff7b85",
        "in_progress": "#d29922",
        "today": "#f85149",
    },
}

PROJECT_QUERY = """
query($owner: String!, $number: Int!, $after: String) {
  %s(login: $owner) {
    projectV2(number: $number) {
      items(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes {
          content {
            ... on Issue {
              number
              title
              closedAt
              stateReason
              milestone { title }
              repository { nameWithOwner }
            }
          }
          fieldValues(first: 50) {
            nodes {
              ... on ProjectV2ItemFieldDateValue {
                date
                field { ... on ProjectV2FieldCommon { name } }
              }
            }
          }
        }
      }
    }
  }
}
"""


# ---------------------------------------------------------------- data

def run_gh(arguments):
    result = subprocess.run(["gh", *arguments], capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def to_local_date(timestamp):
    """Convert a GitHub ISO timestamp (UTC) to a local calendar date."""
    if not timestamp:
        return None
    utc = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    return utc.astimezone(TIMEZONE).date()


def load_tasks(repo, milestone, owner, owner_type, number):
    """Read the milestone's issues and their date fields from the GitHub Project."""
    query = PROJECT_QUERY % owner_type
    tasks, after = [], None

    while True:
        arguments = ["api", "graphql", "-f", f"query={query}",
                     "-F", f"owner={owner}", "-F", f"number={number}"]
        if after:
            arguments += ["-f", f"after={after}"]
        data = run_gh(arguments)

        project = (data.get("data", {}).get(owner_type) or {}).get("projectV2")
        if project is None:
            raise SystemExit(f"Project {number} of {owner} not found, or the token cannot read it.")

        items = project["items"]
        for item in items["nodes"]:
            issue = item.get("content") or {}
            if issue.get("repository", {}).get("nameWithOwner", "").lower() != repo.lower():
                continue
            if (issue.get("milestone") or {}).get("title") != milestone:
                continue
            if issue.get("stateReason") == "NOT_PLANNED":
                continue

            dates = {}
            for value in item["fieldValues"]["nodes"]:
                name = (value.get("field") or {}).get("name")
                if name and value.get("date"):
                    dates[name] = date.fromisoformat(value["date"])

            tasks.append({
                "number": issue["number"],
                "title": issue["title"],
                "planned_start": dates.get(PLANNED_START_FIELD),
                "planned_end": dates.get(PLANNED_END_FIELD),
                "actual_start": dates.get(ACTUAL_START_FIELD),
                "closed": to_local_date(issue.get("closedAt")),
            })

        if not items["pageInfo"]["hasNextPage"]:
            break
        after = items["pageInfo"]["endCursor"]

    # Tasks without any date cannot be placed on the chart
    tasks = [t for t in tasks if t["planned_start"] or t["actual_start"] or t["closed"]]
    tasks.sort(key=lambda t: (t["planned_start"] or t["actual_start"] or t["closed"], t["number"]))
    return tasks


# ---------------------------------------------------------------- chart

def short_title(task, width=42):
    title = task["title"]
    if len(title) > width:
        title = title[: width - 1] + "\u2026"
    return f"#{task['number']}  {title}"


def plot(tasks, start, end, milestone, output, theme="light"):
    colors = THEMES[theme]
    plt.rcParams["font.family"] = "sans-serif"
    plt.rcParams["font.sans-serif"] = FONT_STACK
    today = datetime.now(TIMEZONE).date()
    one_day = timedelta(days=1)

    height = max(3.5, 0.42 * len(tasks) + 2.2)
    fig, ax = plt.subplots(figsize=(13, height))
    fig.patch.set_facecolor(colors["background"])
    ax.set_facecolor(colors["background"])

    missing_start = False
    for row, task in enumerate(tasks):
        # Planned bar: wide and light, behind the actual bar
        if task["planned_start"] and task["planned_end"]:
            ax.barh(row, (task["planned_end"] + one_day - task["planned_start"]).days,
                    left=task["planned_start"], height=0.62, color=colors["planned"], zorder=2)

        # Actual bar: narrow and solid, on top
        actual_end = task["closed"] or today
        if task["actual_start"]:
            if not task["closed"]:
                color = colors["in_progress"]
            elif task["planned_end"] and task["closed"] > task["planned_end"]:
                color = colors["late"]
            else:
                color = colors["on_time"]
            ax.barh(row, (actual_end + one_day - task["actual_start"]).days,
                    left=task["actual_start"], height=0.28, color=color, zorder=3)
        elif task["closed"]:
            # Closed without an actual start: mark the closing day only
            missing_start = True
            ax.text(mdates.date2num(task["closed"]) + 0.5, row, "?", ha="center", va="center",
                    fontsize=12, fontweight="bold", color=colors["late"], zorder=4)

    # Today line, like GitHub's roadmap
    if start <= today <= end + one_day:
        ax.axvline(mdates.date2num(today) + 0.5, color=colors["today"], linewidth=1.5, zorder=4)

    # Rows: issue number and title, first task at the top
    ax.set_yticks(range(len(tasks)))
    ax.set_yticklabels([short_title(t) for t in tasks], fontsize=10, color=colors["text"])
    ax.set_ylim(len(tasks) - 0.4, -0.6)

    # Columns: one per day of the sprint, with the day number centred in each column
    sprint_days = [start + timedelta(days=n) for n in range((end - start).days + 1)]
    ax.set_xlim(mdates.date2num(start), mdates.date2num(end) + 1)
    ax.set_xticks([mdates.date2num(d) + 0.5 for d in sprint_days])
    ax.set_xticklabels([str(d.day) for d in sprint_days])
    ax.xaxis.tick_top()
    for d in sprint_days[1:]:
        ax.axvline(mdates.date2num(d), color=colors["grid"], linewidth=0.8,
                   linestyle=(0, (3, 4)), zorder=1)
    ax.tick_params(colors=colors["muted"], labelsize=9, length=0, pad=6)
    for side in ax.spines.values():
        side.set_color(colors["grid"])
        side.set_linewidth(1.5)

    ax.set_title(f"Gantt Chart \u00b7 {milestone}", fontsize=18, fontweight="bold",
                 color=colors["text"], pad=36)

    legend_items = [
        Patch(color=colors["planned"], label="Planned"),
        Patch(color=colors["on_time"], label="Done on time"),
        Patch(color=colors["late"], label="Done late"),
        Patch(color=colors["in_progress"], label="In progress"),
    ]
    legend = ax.legend(handles=legend_items, loc="upper left", bbox_to_anchor=(0, -0.02),
                       ncol=4, frameon=False, fontsize=11, handlelength=1.4, columnspacing=2)
    for text in legend.get_texts():
        text.set_color(colors["text"])
    if missing_start:
        fig.text(0.99, 0.01, "? = closed without an Actual Start date", ha="right",
                 fontsize=9, color=colors["muted"])

    fig.tight_layout()
    fig.savefig(output, dpi=150, facecolor=colors["background"])
    print(f"Chart saved to {output}")


# ---------------------------------------------------------------- main

def validated(value, pattern, name):
    """Accept the argument only if it fully matches the allowed pattern."""
    if not pattern.fullmatch(value):
        raise SystemExit(f"Invalid value for {name}: {value!r}")
    return value


def main():
    parser = argparse.ArgumentParser(description="Gantt chart of a sprint: planned vs. actual dates")
    parser.add_argument("--repo", required=True, help="owner/repo, e.g. ednasolans/AfterBell")
    parser.add_argument("--milestone", required=True, help="Milestone title, e.g. 'Sprint 1'")
    parser.add_argument("--start", required=True, type=date.fromisoformat, help="Sprint start (YYYY-MM-DD)")
    parser.add_argument("--end", required=True, type=date.fromisoformat, help="Sprint end (YYYY-MM-DD)")
    parser.add_argument("--project-number", required=True, type=int, help="Number of the GitHub Project")
    parser.add_argument("--project-owner", help="Owner of the Project (default: owner of the repo)")
    parser.add_argument("--owner-type", choices=["user", "organization"], default="user",
                        help="Whether the Project belongs to a user or an organization")
    parser.add_argument("--output", default=None,
                        help="Output file name, saved in the current folder (default: gantt-<milestone>.png)")
    parser.add_argument("--theme", choices=THEMES.keys(), default="light", help="light or dark")
    args = parser.parse_args()

    repo = validated(args.repo, REPO_PATTERN, "--repo")
    milestone = validated(args.milestone, MILESTONE_PATTERN, "--milestone")
    owner = validated(args.project_owner or repo.split("/")[0], OWNER_PATTERN, "--project-owner")
    file_name = args.output or f"gantt-{milestone.replace(' ', '-')}.png"
    file_name = validated(file_name, OUTPUT_PATTERN, "--output")
    output = Path.cwd() / file_name  # only a file name: always saved in the current folder

    tasks = load_tasks(repo, milestone, owner, args.owner_type, args.project_number)
    if not tasks:
        print("No issues with dates found in this milestone.")
        return

    plot(tasks, args.start, args.end, milestone, output, args.theme)


if __name__ == "__main__":
    main()