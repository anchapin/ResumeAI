"""
Version commands for resume-cli.

Provides commands to manage resume version history.
"""

import click
from pathlib import Path
from rich.console import Console
from rich.table import Table

from ..utils.versioning import (
    ResumeVersionManager,
    format_version_number,
    get_version_time_ago,
)

console = Console()


@click.group(name="version")
def version_group():
    """Manage resume version history."""
    pass


@version_group.command(name="save")
@click.option(
    "--message",
    "-m",
    "change_description",
    help="Description of changes in this version",
)
@click.pass_context
def save_version(ctx, change_description):
    """Save a new version of the resume."""
    yaml_path = ctx.obj["yaml_path"]
    version_manager = ResumeVersionManager(yaml_path)

    version_info = version_manager.create_version(change_description=change_description)

    console.print(
        f"[green]✓[/green] Created version {format_version_number(version_info['version_number'])}"
    )
    if change_description:
        console.print(f"  Description: {change_description}")


@version_group.command(name="list")
@click.pass_context
def list_versions(ctx):
    """List all saved versions of the resume."""
    yaml_path = ctx.obj["yaml_path"]
    version_manager = ResumeVersionManager(yaml_path)

    versions = version_manager.list_versions()

    if not versions:
        console.print("[yellow]No versions saved yet.[/yellow]")
        console.print("Use [cyan]resume-cli version save[/cyan] to create a version.")
        return

    table = Table(title="Resume Versions")
    table.add_column("Version", style="cyan")
    table.add_column("Created", style="dim")
    table.add_column("Description")

    for version in versions:
        table.add_row(
            format_version_number(version["version_number"]),
            get_version_time_ago(version["created_at"]),
            version.get("change_description", ""),
        )

    console.print(table)


@version_group.command(name="restore")
@click.argument("version", type=int)
@click.pass_context
def restore_version(ctx, version):
    """Restore a previous version of the resume."""
    yaml_path = ctx.obj["yaml_path"]
    version_manager = ResumeVersionManager(yaml_path)

    # Confirm restoration
    if not click.confirm(
        f"Are you sure you want to restore to version {format_version_number(version)}?"
    ):
        console.print("[yellow]Restore cancelled.[/yellow]")
        return

    success = version_manager.restore_version(version)

    if success:
        console.print(
            f"[green]✓[/green] Restored to version {format_version_number(version)}"
        )
        console.print(
            f"[dim]A backup of the current version was created before restore.[/dim]"
        )
    else:
        console.print(
            f"[red]✗[/red] Version {format_version_number(version)} not found."
        )


@version_group.command(name="show")
@click.argument("version", type=int)
@click.pass_context
def show_version(ctx, version):
    """Show the content of a specific version."""
    yaml_path = ctx.obj["yaml_path"]
    version_manager = ResumeVersionManager(yaml_path)

    content = version_manager.get_version_content(version)

    if content is None:
        console.print(
            f"[red]✗[/red] Version {format_version_number(version)} not found."
        )
        return

    version_info = version_manager.get_version(version)
    console.print(f"[cyan]Version {format_version_number(version)}[/cyan]")
    console.print(f"Created: {get_version_time_ago(version_info['created_at'])}")
    if version_info.get("change_description"):
        console.print(f"Description: {version_info['change_description']}")
    console.print()
    console.print(content)


@version_group.command(name="diff")
@click.argument("version1", type=int)
@click.argument("version2", type=int, required=False)
@click.pass_context
def compare_versions(ctx, version1, version2):
    """Compare two versions of the resume."""
    yaml_path = ctx.obj["yaml_path"]
    version_manager = ResumeVersionManager(yaml_path)

    # If only one version provided, compare with current
    if version2 is None:
        # Get current version
        versions = version_manager.list_versions()
        if not versions:
            console.print("[red]No versions to compare with.[/red]")
            return
        version2 = versions[0]["version_number"]

    result = version_manager.compare_versions(version1, version2)

    if result is None:
        console.print("[red]Could not compare versions. Check version numbers.[/red]")
        return

    console.print(f"[cyan]Comparing v{version1}.0 with v{version2}.0[/cyan]")
    console.print()
    console.print(
        f"Lines: {result['version1_lines']} → {result['version2_lines']} ({result['line_diff']:+d})"
    )
    console.print(
        f"Characters: {result['version1_chars']} → {result['version2_chars']} ({result['char_diff']:+d})"
    )


@version_group.command(name="delete")
@click.argument("version", type=int)
@click.pass_context
def delete_version(ctx, version):
    """Delete a specific version."""
    yaml_path = ctx.obj["yaml_path"]
    version_manager = ResumeVersionManager(yaml_path)

    # Confirm deletion
    if not click.confirm(
        f"Are you sure you want to delete version {format_version_number(version)}?"
    ):
        console.print("[yellow]Delete cancelled.[/yellow]")
        return

    success = version_manager.delete_version(version)

    if success:
        console.print(
            f"[green]✓[/green] Deleted version {format_version_number(version)}"
        )
    else:
        console.print(
            f"[red]✗[/red] Version {format_version_number(version)} not found."
        )
