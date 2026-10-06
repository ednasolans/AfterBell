"""
Burndown chart for a GitHub milestone.

Reads the milestone's issues with the GitHub CLI (gh) and draws, day by day,
the remaining work against the ideal line. Work is measured in issues, or in
hours if an estimates file is given.

Usage:
    python burndown.py --repo ednasolans/AfterBell --milestone Sp1 \
        --start 2026-10-05 --end 2026-11-01

    # Measure hours instead of issues (only issues in the file are counted)
    python burndown.py --repo ednasolans/AfterBell --milestone Sp1 \
        --start 2026-10-05 --end 2026-11-01 --estimates estimates.json

Requirements: gh (logged in with `gh auth login`) and matplotlib.
"""

import argparse
import json
import subprocess
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import logging

import matplotlib

matplotlib.use("Agg")  # no display needed (also works in GitHub Actions)
import matplotlib.dates as mdates
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter, MaxNLocator

TIMEZONE = ZoneInfo("Europe/Madrid")

# GitHub's font stack: the first one installed on the machine is used
# (Segoe UI on Windows, Helvetica on macOS, Noto Sans on Linux).
FONT_STACK = ["Segoe UI", "Helvetica Neue", "Helvetica", "Noto Sans", "Arial", "DejaVu Sans"]
logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)

# Colours from Primer, GitHub's design system: green = open, grey = neutral.
THEMES = {
    "light": {
        "background": "#ffffff",
        "text": "#1f2328",
        "muted": "#59636e",
        "grid": "#d1d9e0",
        "remaining": "#1a7f37",
        "ideal": "#818b98",
    },
    "dark": {
        "background": "#0d1117",
        "text": "#f0f6fc",
        "muted": "#9198a1",
        "grid": "#3d444d",
        "remaining": "#3fb950",
        "ideal": "#656c76",
    },
}


def load_issues(repo, milestone, input_file=None):
    """Return the milestone's issues as a list of dicts (from gh or a JSON file)."""
    if input_file:
        with open(input_file, encoding="utf-8") as f:
            return json.load(f)

    result = subprocess.run(
        [
            "gh", "issue", "list",
            "--repo", repo,
            "--milestone", milestone,
            "--state", "all",
            "--limit", "500",
            "--json", "number,title,createdAt,closedAt,stateReason",
        ],
        capture_output=True, text=True, check=True,
    )
    return json.loads(result.stdout)


def to_local_date(timestamp):
    """Convert a GitHub ISO timestamp (UTC) to a local calendar date."""
    if not timestamp:
        return None
    utc = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    return utc.astimezone(TIMEZONE).date()


def compute_burndown(issues, start, end, estimates=None):
    """
    Remaining work at the end of each day between start and end.

    An issue counts as remaining on a day if it already existed (or the sprint
    had not started yet) and it was not closed by the end of that day.
    Issues closed as "not planned" are removed from the scope.
    """
    today = datetime.now(TIMEZONE).date()
    days, remaining = [], []

    day = start
    while day <= min(end, today):
        total = 0.0
        for issue in issues:
            weight = 1.0
            if estimates is not None:
                weight = estimates.get(str(issue["number"]))
                if weight is None:
                    continue  # only estimated issues count when measuring hours

            if issue.get("stateReason") == "NOT_PLANNED":
                continue

            created = to_local_date(issue["createdAt"])
            closed = to_local_date(issue.get("closedAt"))

            existed = created <= max(day, start)
            still_open = closed is None or closed > day
            if existed and still_open:
                total += weight

        days.append(day)
        remaining.append(total)
        day += timedelta(days=1)

    return days, remaining


def plot(days, remaining, start, end, milestone, unit, output, theme="light"):
    colors = THEMES[theme]
    plt.rcParams["font.family"] = "sans-serif"
    plt.rcParams["font.sans-serif"] = FONT_STACK

    fig, ax = plt.subplots(figsize=(10, 5))
    fig.patch.set_facecolor(colors["background"])
    ax.set_facecolor(colors["background"])

    # Ideal line, from the initial scope to zero on the last day
    initial = remaining[0] if remaining else 0
    ax.plot([start, end], [initial, 0], linestyle=(0, (4, 3)), linewidth=1.5,
            color=colors["ideal"], label="Ideal")

    # Remaining work: line with a soft area underneath, like GitHub's charts
    ax.fill_between(days, remaining, color=colors["remaining"], alpha=0.15, linewidth=0)
    ax.plot(days, remaining, linewidth=2, color=colors["remaining"], label="Remaining")

    # Title and subtitle, left-aligned
    fig.text(0.06, 0.94, f"Burndown · {milestone}", fontsize=14,
             fontweight="semibold", color=colors["text"], ha="left")
    fig.text(0.06, 0.885, f"Remaining work ({unit}) per day", fontsize=10,
             color=colors["muted"], ha="left")

    # Axes: no frame, horizontal grid only, muted labels
    for side in ("top", "right", "left"):
        ax.spines[side].set_visible(False)
    ax.spines["bottom"].set_color(colors["grid"])
    ax.grid(axis="y", color=colors["grid"], linewidth=0.8)
    ax.set_axisbelow(True)
    ax.tick_params(colors=colors["muted"], labelsize=9, length=0, pad=8)

    ax.set_xlim(start, end)
    ax.set_ylim(bottom=0, top=max(initial, max(remaining, default=0)) * 1.1 or 1)
    ax.yaxis.set_major_locator(MaxNLocator(nbins=5, integer=True))
    ax.xaxis.set_major_locator(mdates.WeekdayLocator(byweekday=mdates.MO))
    ax.xaxis.set_major_formatter(FuncFormatter(
        lambda value, _: (lambda d: f"{d:%b} {d.day}")(mdates.num2date(value))))

    # Legend at the top right, without a frame, like GitHub's
    legend = ax.legend(loc="lower right", bbox_to_anchor=(1, 1.02), ncol=2,
                       frameon=False, fontsize=9, handlelength=1.6)
    for text in legend.get_texts():
        text.set_color(colors["muted"])

    fig.subplots_adjust(left=0.06, right=0.97, top=0.8, bottom=0.1)
    fig.savefig(output, dpi=150, facecolor=colors["background"])
    print(f"Chart saved to {output}")


def main():
    parser = argparse.ArgumentParser(description="Burndown chart for a GitHub milestone")
    parser.add_argument("--repo", required=True, help="owner/repo, e.g. ednasolans/AfterBell")
    parser.add_argument("--milestone", required=True, help="Milestone title, e.g. Sp1")
    parser.add_argument("--start", required=True, type=date.fromisoformat, help="Sprint start (YYYY-MM-DD)")
    parser.add_argument("--end", required=True, type=date.fromisoformat, help="Sprint end (YYYY-MM-DD)")
    parser.add_argument("--estimates", help="JSON file {issue number: hours}; measures hours instead of issues")
    parser.add_argument("--input", help="Read issues from a JSON file instead of calling gh")
    parser.add_argument("--output", default=None, help="Output image (default: burndown-<milestone>.png)")
    parser.add_argument("--theme", choices=THEMES.keys(), default="light", help="light or dark, like GitHub")
    args = parser.parse_args()

    estimates = None
    if args.estimates:
        with open(args.estimates, encoding="utf-8") as f:
            estimates = {str(k): float(v) for k, v in json.load(f).items()}

    issues = load_issues(args.repo, args.milestone, args.input)
    days, remaining = compute_burndown(issues, args.start, args.end, estimates)

    if not days:
        print("The sprint has not started yet: nothing to draw.")
        return

    unit = "hours" if estimates is not None else "issues"
    output = args.output or f"burndown-{args.milestone}.png"
    plot(days, remaining, args.start, args.end, args.milestone, unit, output, args.theme)


if __name__ == "__main__":
    main()
