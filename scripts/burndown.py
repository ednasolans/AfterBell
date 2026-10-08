"""
Burndown chart for a GitHub milestone.

Draws, day by day, the open issues and the issues closed each day against the
ideal line. If the GitHub Project has an estimated-hours field, it also draws
the remaining effort in hours, and if it has an actual-hours field, it shows
estimated vs. actual hours of the closed issues.

Usage (issues only):
    python burndown.py --repo ednasolans/AfterBell --milestone "Sprint 1" \
        --start 2026-10-05 --end 2026-10-27

Usage (with hours from the GitHub Project):
    python burndown.py --repo ednasolans/AfterBell --milestone "Sprint 1" \
        --start 2026-10-05 --end 2026-10-27 \
        --project-number 1 --estimate-field "Estimated hours" --actual-field "Actual hours"

Requirements: gh (logged in, with the read:project scope to read the Project)
and matplotlib.
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
import matplotlib.pyplot as plt
from matplotlib.ticker import MaxNLocator

TIMEZONE = ZoneInfo("Europe/Madrid")

# Allowed values for the command-line arguments (they are passed to gh)
REPO_PATTERN = re.compile(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+")
OWNER_PATTERN = re.compile(r"[A-Za-z0-9][A-Za-z0-9-]{0,38}")
MILESTONE_PATTERN = re.compile(r"[A-Za-z0-9][A-Za-z0-9 _.-]{0,49}")
FIELD_PATTERN = re.compile(r"\w[\w ()./-]{0,49}")
OUTPUT_PATTERN = re.compile(r"[A-Za-z0-9_.-]+\.png")

# GitHub's font stack: the first one installed on the machine is used
# (Segoe UI on Windows, Helvetica on macOS, Noto Sans on Linux).
FONT_STACK = ["Segoe UI", "Helvetica Neue", "Helvetica", "Noto Sans", "Arial", "DejaVu Sans"]
logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)

THEMES = {
    "light": {
        "background": "#ffffff",
        "text": "#1f2328",
        "muted": "#59636e",
        "grid": "#d9dde3",
        "remaining": "#00d65f",
        "completed": "#00e05f",
        "effort": "#7048e8",
        "ideal": "#ff9aa2",
    },
    "dark": {
        "background": "#0d1117",
        "text": "#f0f6fc",
        "muted": "#9198a1",
        "grid": "#3d444d",
        "remaining": "#3fb950",
        "completed": "#2ea043",
        "effort": "#a371f7",
        "ideal": "#ff8a94",
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
            ... on Issue { number repository { nameWithOwner } }
          }
          fieldValues(first: 50) {
            nodes {
              ... on ProjectV2ItemFieldNumberValue {
                number
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


def load_issues(repo, milestone):
    """Return the milestone's issues as a list of dicts, read with the gh CLI."""
    return run_gh([
        "issue", "list",
        f"--repo={repo}",
        f"--milestone={milestone}",
        "--state=all",
        "--limit=500",
        "--json=number,title,createdAt,closedAt,stateReason",
    ])


def load_project_hours(repo, owner, owner_type, number, fields):
    """
    Read number fields (e.g. estimated and actual hours) from a GitHub Project.
    Returns {field name: {issue number: value}} for the issues of `repo`.
    """
    hours = {field: {} for field in fields}
    query = PROJECT_QUERY % owner_type
    after = None

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
            content = item.get("content") or {}
            if content.get("repository", {}).get("nameWithOwner", "").lower() != repo.lower():
                continue
            for value in item["fieldValues"]["nodes"]:
                name = (value.get("field") or {}).get("name")
                if name in hours and value.get("number") is not None:
                    hours[name][content["number"]] = float(value["number"])

        if not items["pageInfo"]["hasNextPage"]:
            return hours
        after = items["pageInfo"]["endCursor"]


def to_local_date(timestamp):
    """Convert a GitHub ISO timestamp (UTC) to a local calendar date."""
    if not timestamp:
        return None
    utc = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    return utc.astimezone(TIMEZONE).date()


def compute_burndown(issues, start, end, estimates=None):
    """
    For each day between start and end (up to today), return:
    - remaining: issues still open at the end of the day
    - completed: issues closed during that day
    - effort: estimated hours of the issues still open (only with estimates)

    An issue counts as open on a day if it already existed (or the sprint
    had not started yet) and it was not closed by the end of that day.
    Issues closed as "not planned" are removed from the scope.
    """
    today = datetime.now(TIMEZONE).date()
    days, remaining, completed, effort = [], [], [], []

    day = start
    while day <= min(end, today):
        open_count, closed_today, open_hours = 0, 0, 0.0
        for issue in issues:
            if issue.get("stateReason") == "NOT_PLANNED":
                continue

            created = to_local_date(issue["createdAt"])
            closed = to_local_date(issue.get("closedAt"))

            existed = created <= max(day, start)
            if existed and (closed is None or closed > day):
                open_count += 1
                if estimates:
                    open_hours += estimates.get(issue["number"], 0.0)
            if closed == day:
                closed_today += 1

        days.append(day)
        remaining.append(open_count)
        completed.append(closed_today)
        effort.append(open_hours)
        day += timedelta(days=1)

    return days, remaining, completed, (effort if estimates else None)


def hours_summary(issues, estimates, actuals):
    """Estimated vs. actual hours of the closed issues that have both values."""
    closed = [i["number"] for i in issues
              if i.get("closedAt") and i.get("stateReason") != "NOT_PLANNED"]
    both = [n for n in closed if n in estimates and n in actuals]
    if not both:
        return None
    estimated = sum(estimates[n] for n in both)
    actual = sum(actuals[n] for n in both)
    return estimated, actual, len(both)


# ---------------------------------------------------------------- chart

def style_axis(ax, colors):
    ax.tick_params(colors=colors["muted"], labelsize=10, length=0, pad=8)
    for side in ax.spines.values():
        side.set_color(colors["grid"])
        side.set_linewidth(1.5)


def format_hours(value):
    return f"{value:g}"


def plot(days, remaining, completed, effort, summary, start, end, milestone, output, theme="light"):
    colors = THEMES[theme]
    plt.rcParams["font.family"] = "sans-serif"
    plt.rcParams["font.sans-serif"] = FONT_STACK

    total_days = (end - start).days
    x_done = list(range(len(days)))  # day numbers that already happened

    fig, ax = plt.subplots(figsize=(12, 6.8))
    fig.patch.set_facecolor(colors["background"])
    ax.set_facecolor(colors["background"])

    # With hours: effort on the left axis and tasks on the right axis.
    # Without hours: tasks on a single axis.
    if effort is not None:
        tasks_ax = ax.twinx()
        initial_effort = effort[0]
        ax.plot([0, total_days], [initial_effort, 0], color=colors["ideal"], linewidth=2.5,
                label="Ideal Burndown", zorder=3)
        ax.plot(x_done, effort, color=colors["effort"], linewidth=2.5, marker="o",
                markersize=7, label="Remaining Effort", zorder=5)
        ax.set_ylim(0, max(initial_effort, max(effort), 1) * 1.1)
        ax.set_ylabel("Remaining Effort (hours)", fontsize=12, color=colors["text"], labelpad=12)
        tasks_ax.set_ylabel("Remaining and Completed Tasks", fontsize=12,
                            color=colors["text"], labelpad=12)
    else:
        tasks_ax = ax
        initial = remaining[0]
        ax.plot([0, total_days], [initial, 0], color=colors["ideal"], linewidth=2.5,
                label="Ideal Burndown", zorder=3)
        ax.set_ylabel("Remaining and Completed Tasks", fontsize=12, color=colors["text"], labelpad=12)

    tasks_ax.bar(x_done, completed, width=0.45, color=colors["completed"],
                 label="Completed Tasks", zorder=2)
    tasks_ax.plot(x_done, remaining, color=colors["remaining"], linewidth=2.5,
                  label="Remaining Tasks", zorder=4)
    tasks_ax.set_ylim(0, max(max(remaining), 1) * 1.1)
    tasks_ax.yaxis.set_major_locator(MaxNLocator(nbins=6, integer=True))

    # Title and estimated-vs-actual summary
    ax.set_title(f"Burndown Chart \u00b7 {milestone}", fontsize=18, fontweight="bold",
                 color=colors["text"], pad=34 if summary else 24)
    if summary:
        estimated, actual, count = summary
        difference = (actual - estimated) / estimated * 100 if estimated else 0
        ax.text(0.5, 1.03,
                f"Closed issues ({count}): {format_hours(estimated)} h estimated \u00b7 "
                f"{format_hours(actual)} h actual ({difference:+.0f}%)",
                transform=ax.transAxes, ha="center", fontsize=11, color=colors["muted"])

    # Axes: one tick per day, vertical dashed lines and horizontal grid
    ax.set_xlim(-0.6, total_days + 0.6)
    ax.set_xticks(range(total_days + 1))
    ax.set_xticklabels(["Day"] + [str(n) for n in range(1, total_days + 1)])
    ax.grid(axis="y", color=colors["grid"], linewidth=1)
    # Vertical day lines go on the lower axis, so they stay behind the bars
    tasks_ax.grid(axis="x", color=colors["grid"], linewidth=0.8, linestyle=(0, (3, 4)))
    tasks_ax.set_xticks(range(total_days + 1))
    ax.set_axisbelow(True)
    tasks_ax.set_axisbelow(True)
    ax.set_zorder(tasks_ax.get_zorder() + 1 if tasks_ax is not ax else 0)
    ax.patch.set_visible(tasks_ax is ax)
    if tasks_ax is not ax:
        tasks_ax.set_facecolor(colors["background"])
    style_axis(ax, colors)
    if tasks_ax is not ax:
        style_axis(tasks_ax, colors)

    # Legend at the bottom, in the same order as the classic chart
    handles, labels = [], []
    for axis in {ax, tasks_ax}:
        h, l = axis.get_legend_handles_labels()
        handles += h
        labels += l
    wanted = ["Completed Tasks", "Remaining Tasks", "Remaining Effort", "Ideal Burndown"]
    order = [labels.index(name) for name in wanted if name in labels]
    legend = ax.legend([handles[i] for i in order], [labels[i] for i in order],
                       loc="upper left", bbox_to_anchor=(0, -0.1), ncol=4, frameon=False,
                       fontsize=11, handlelength=1.4, columnspacing=2)
    for text in legend.get_texts():
        text.set_color(colors["text"])

    fig.subplots_adjust(left=0.08, right=0.92 if tasks_ax is not ax else 0.97, top=0.86, bottom=0.2)
    fig.savefig(output, dpi=150, facecolor=colors["background"])
    print(f"Chart saved to {output}")


# ---------------------------------------------------------------- main

def validated(value, pattern, name):
    """Accept the argument only if it fully matches the allowed pattern."""
    if not pattern.fullmatch(value):
        raise SystemExit(f"Invalid value for {name}: {value!r}")
    return value


def main():
    parser = argparse.ArgumentParser(description="Burndown chart for a GitHub milestone")
    parser.add_argument("--repo", required=True, help="owner/repo, e.g. ednasolans/AfterBell")
    parser.add_argument("--milestone", required=True, help="Milestone title, e.g. 'Sprint 1'")
    parser.add_argument("--start", required=True, type=date.fromisoformat, help="Sprint start (YYYY-MM-DD)")
    parser.add_argument("--end", required=True, type=date.fromisoformat, help="Sprint end (YYYY-MM-DD)")
    parser.add_argument("--output", default=None,
                        help="Output file name, saved in the current folder (default: burndown-<milestone>.png)")
    parser.add_argument("--theme", choices=THEMES.keys(), default="light", help="light or dark")
    parser.add_argument("--project-number", type=int, help="Number of the GitHub Project with the hours")
    parser.add_argument("--project-owner", help="Owner of the Project (default: owner of the repo)")
    parser.add_argument("--owner-type", choices=["user", "organization"], default="user",
                        help="Whether the Project belongs to a user or an organization")
    parser.add_argument("--estimate-field", help="Name of the Project's estimated-hours field")
    parser.add_argument("--actual-field", help="Name of the Project's actual-hours field")
    args = parser.parse_args()

    repo = validated(args.repo, REPO_PATTERN, "--repo")
    milestone = validated(args.milestone, MILESTONE_PATTERN, "--milestone")
    file_name = args.output or f"burndown-{milestone.replace(' ', '-')}.png"
    file_name = validated(file_name, OUTPUT_PATTERN, "--output")
    output = Path.cwd() / file_name  # only a file name: always saved in the current folder

    issues = load_issues(repo, milestone)

    estimates, actuals = None, {}
    if args.project_number and args.estimate_field:
        owner = validated(args.project_owner or repo.split("/")[0], OWNER_PATTERN, "--project-owner")
        fields = [validated(args.estimate_field, FIELD_PATTERN, "--estimate-field")]
        if args.actual_field:
            fields.append(validated(args.actual_field, FIELD_PATTERN, "--actual-field"))
        hours = load_project_hours(repo, owner, args.owner_type, args.project_number, fields)
        estimates = hours[fields[0]]
        actuals = hours.get(args.actual_field, {}) if args.actual_field else {}
        print(f"Estimated hours found for {len(estimates)} issues, actual hours for {len(actuals)}.")

    days, remaining, completed, effort = compute_burndown(issues, args.start, args.end, estimates)
    if not days:
        print("The sprint has not started yet: nothing to draw.")
        return

    summary = hours_summary(issues, estimates or {}, actuals) if actuals else None
    plot(days, remaining, completed, effort, summary, args.start, args.end, milestone, output, args.theme)


if __name__ == "__main__":
    main()