"""
Earned Value Management (EVM) metrics of a sprint, calculated once at the end.

Data comes from the GitHub Project:
- BAC: sum of "Hours estimated" of the milestone's issues
- PV:  estimated hours that should be done by the report date, according to
       each issue's "Start date" and "Target Date"
- EV:  estimated hours of the issues closed by the report date (0/100 rule)
- AC:  sum of "Hours completed" (actual hours worked)

Prints a Markdown report, ready for the GitHub Actions job summary or the sprint report.

Usage:
    python evm.py --repo ednasolans/AfterBell --milestone "Sprint 1" \
        --date 2026-10-27 --project-number 2 --hourly-rate 20

Requirements: gh (logged in, with the read:project scope).
"""

import argparse
import json
import re
import subprocess
from datetime import date, datetime
from zoneinfo import ZoneInfo

TIMEZONE = ZoneInfo("Europe/Madrid")

# Names of the Project's fields
ESTIMATE_FIELD = "Hours estimated"
ACTUAL_FIELD = "Hours completed"
PLANNED_START_FIELD = "Start date"
PLANNED_END_FIELD = "Target Date"

# Allowed values for the command-line arguments (they are passed to gh)
REPO_PATTERN = re.compile(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+")
OWNER_PATTERN = re.compile(r"[A-Za-z0-9][A-Za-z0-9-]{0,38}")
MILESTONE_PATTERN = re.compile(r"[A-Za-z0-9][A-Za-z0-9 _.-]{0,49}")

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
              ... on ProjectV2ItemFieldNumberValue {
                number
                field { ... on ProjectV2FieldCommon { name } }
              }
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
    try:
        result = subprocess.run(["gh", *arguments], capture_output=True, text=True, check=True)
    except subprocess.CalledProcessError as error:
        raise SystemExit(f"gh failed (exit code {error.returncode}): {error.stderr.strip()}")
    return json.loads(result.stdout)


def to_local_date(timestamp):
    if not timestamp:
        return None
    utc = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    return utc.astimezone(TIMEZONE).date()


def load_tasks(repo, milestone, owner, owner_type, number):
    """Read the milestone's issues and their hours and dates from the GitHub Project."""
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

            fields = {}
            for value in item["fieldValues"]["nodes"]:
                name = (value.get("field") or {}).get("name")
                if not name:
                    continue
                if value.get("number") is not None:
                    fields[name] = float(value["number"])
                elif value.get("date"):
                    fields[name] = date.fromisoformat(value["date"])

            tasks.append({
                "number": issue["number"],
                "title": issue["title"],
                "estimate": fields.get(ESTIMATE_FIELD),
                "actual": fields.get(ACTUAL_FIELD),
                "planned_start": fields.get(PLANNED_START_FIELD),
                "planned_end": fields.get(PLANNED_END_FIELD),
                "closed": to_local_date(issue.get("closedAt")),
            })

        if not items["pageInfo"]["hasNextPage"]:
            return sorted(tasks, key=lambda t: t["number"])
        after = items["pageInfo"]["endCursor"]


# ---------------------------------------------------------------- metrics

def planned_fraction(task, report_date):
    """Share of the task that should be finished by report_date, according to its plan."""
    start, end = task["planned_start"], task["planned_end"]
    if report_date >= end:
        return 1.0
    if report_date < start:
        return 0.0
    total_days = (end - start).days + 1
    elapsed_days = (report_date - start).days + 1
    return elapsed_days / total_days


def calculate(tasks, report_date):
    estimated = [t for t in tasks if t["estimate"] is not None]
    bac = sum(t["estimate"] for t in estimated)
    pv = sum(t["estimate"] * planned_fraction(t, report_date)
             for t in estimated if t["planned_start"] and t["planned_end"])
    ev = sum(t["estimate"] for t in estimated if t["closed"] and t["closed"] <= report_date)
    ac = sum(t["actual"] for t in tasks if t["actual"] is not None)

    cpi = ev / ac if ac else None
    spi = ev / pv if pv else None
    eac = bac / cpi if cpi else None
    etc = eac - ac if eac is not None else None
    vac = bac - eac if eac is not None else None

    warnings = {
        "without estimated hours": [t for t in tasks if t["estimate"] is None],
        "with estimated hours but without Start date / Target Date":
            [t for t in estimated if not (t["planned_start"] and t["planned_end"])],
        "closed without actual hours":
            [t for t in tasks if t["closed"] and t["actual"] is None],
    }
    return {"BAC": bac, "PV": pv, "EV": ev, "AC": ac, "EAC": eac, "ETC": etc,
            "VAC": vac, "CPI": cpi, "SPI": spi}, warnings


# ---------------------------------------------------------------- report

def hours(value):
    return "n/a" if value is None else f"{value:,.1f} h"


def euros(value, rate):
    return "n/a" if value is None else f"{value * rate:,.0f} €"


def index(value):
    return "n/a" if value is None else f"{value:.2f}"


def interpretation(metrics):
    lines = []
    cpi, spi, vac = metrics["CPI"], metrics["SPI"], metrics["VAC"]
    if cpi is not None:
        if cpi >= 1:
            lines.append(f"- **Cost:** CPI = {cpi:.2f} → the work done took fewer hours than estimated.")
        else:
            lines.append(f"- **Cost:** CPI = {cpi:.2f} → the work done took more hours than estimated.")
    if spi is not None:
        if spi >= 1:
            lines.append(f"- **Schedule:** SPI = {spi:.2f} → on or ahead of the plan.")
        else:
            lines.append(f"- **Schedule:** SPI = {spi:.2f} → behind the plan "
                         f"({(1 - spi) * 100:.0f}% of the planned work is not done).")
    if vac is not None:
        if vac >= 0:
            lines.append(f"- **Forecast:** VAC = {vac:.1f} h → expected saving at completion.")
        else:
            lines.append(f"- **Forecast:** VAC = {vac:.1f} h → expected overrun at completion.")
    return lines


def report(milestone, report_date, rate, tasks, metrics, warnings):
    m = metrics
    out = [
        f"## EVM metrics · {milestone}",
        "",
        f"Report date: **{report_date.isoformat()}** · Hourly rate: **{rate:g} €/h** · "
        f"Issues: **{len(tasks)}** · EV uses the 0/100 rule (an issue counts only when it is closed).",
        "",
        "| KPI | Name | Hours | Cost |",
        "| --- | --- | ---: | ---: |",
        f"| BAC | Budget at Completion | {hours(m['BAC'])} | {euros(m['BAC'], rate)} |",
        f"| PV | Planned Value | {hours(m['PV'])} | {euros(m['PV'], rate)} |",
        f"| EV | Earned Value | {hours(m['EV'])} | {euros(m['EV'], rate)} |",
        f"| AC | Actual Cost | {hours(m['AC'])} | {euros(m['AC'], rate)} |",
        f"| EAC | Estimate at Completion | {hours(m['EAC'])} | {euros(m['EAC'], rate)} |",
        f"| ETC | Estimate to Complete | {hours(m['ETC'])} | {euros(m['ETC'], rate)} |",
        f"| VAC | Variance at Completion | {hours(m['VAC'])} | {euros(m['VAC'], rate)} |",
        f"| CPI | Cost Performance Index | {index(m['CPI'])} | |",
        f"| SPI | Schedule Performance Index | {index(m['SPI'])} | |",
        "",
        "### Interpretation",
        "",
        *interpretation(metrics),
        "",
        "### Issues",
        "",
        "| Issue | Estimated | Actual | Planned end | Closed |",
        "| --- | ---: | ---: | --- | --- |",
    ]
    for t in tasks:
        title = t["title"].replace("|", "/")
        out.append(
            f"| #{t['number']} {title} | {hours(t['estimate'])} | {hours(t['actual'])} | "
            f"{t['planned_end'] or '—'} | {t['closed'] or 'open'} |")

    problems = [(label, items) for label, items in warnings.items() if items]
    if problems:
        out += ["", "### Data to review", ""]
        for label, items in problems:
            numbers = ", ".join(f"#{t['number']}" for t in items)
            out.append(f"- Issues {label}: {numbers}")
    return "\n".join(out)


# ---------------------------------------------------------------- main

def validated(value, pattern, name):
    if not pattern.fullmatch(value):
        raise SystemExit(f"Invalid value for {name}: {value!r}")
    return value


def main():
    parser = argparse.ArgumentParser(description="EVM metrics of a sprint")
    parser.add_argument("--repo", required=True, help="owner/repo, e.g. ednasolans/AfterBell")
    parser.add_argument("--milestone", required=True, help="Milestone title, e.g. 'Sprint 1'")
    parser.add_argument("--date", type=date.fromisoformat, default=None,
                        help="Report date, usually the last day of the sprint (default: today)")
    parser.add_argument("--project-number", required=True, type=int, help="Number of the GitHub Project")
    parser.add_argument("--project-owner", help="Owner of the Project (default: owner of the repo)")
    parser.add_argument("--owner-type", choices=["user", "organization"], default="user")
    parser.add_argument("--hourly-rate", type=float, default=20.0, help="Cost of one hour in euros")
    args = parser.parse_args()

    repo = validated(args.repo, REPO_PATTERN, "--repo")
    milestone = validated(args.milestone, MILESTONE_PATTERN, "--milestone")
    owner = validated(args.project_owner or repo.split("/")[0], OWNER_PATTERN, "--project-owner")
    report_date = args.date or datetime.now(TIMEZONE).date()

    tasks = load_tasks(repo, milestone, owner, args.owner_type, args.project_number)
    if not tasks:
        raise SystemExit("No issues found in this milestone.")

    metrics, warnings = calculate(tasks, report_date)
    print(report(milestone, report_date, args.hourly_rate, tasks, metrics, warnings))


if __name__ == "__main__":
    main()