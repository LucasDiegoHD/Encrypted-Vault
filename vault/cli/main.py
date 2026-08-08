"""
LockPy Vault - CLI Entry Point
Interactive Rich / Click Command Line Interface.
"""

import sys
import datetime
from pathlib import Path
import click

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.prompt import Confirm

from vault.core.crypto import generate_secure_password
from vault.core.storage import (
    get_default_vault_path,
    init_vault,
    load_vault,
    save_vault,
    StorageError,
)
from vault.cli.clipboard import copy_with_autowipe

console = Console()


def print_banner():
    banner = (
        "[bold magenta]Encrypted Vault[/bold magenta] [cyan]v1.0.0[/cyan] - "
        "[italic dim]Zero-Knowledge Vault[/italic dim]"
    )
    console.print(Panel(banner, border_style="bright_blue", expand=False))


@click.group()
def cli():
    """Encrypted Vault: Zero-Knowledge local password manager."""
    pass


@cli.command("init")
@click.option(
    "--path", type=click.Path(), default=None, help="Custom path for vault file."
)
def init_cmd(path):
    """Initialize a new encrypted vault."""
    print_banner()
    vault_path = Path(path) if path else get_default_vault_path()

    if vault_path.exists():
        console.print(
            f"[bold red]Error:[/bold red] Vault already exists at [yellow]{vault_path}[/yellow]"
        )
        sys.exit(1)

    console.print(f"Creating new vault at: [cyan]{vault_path}[/cyan]")
    master_pass = click.prompt(
        "Enter Master Password", hide_input=True, confirmation_prompt=True
    )

    try:
        init_vault(vault_path, master_pass)
        console.print("[bold green]✔ Vault initialized successfully![/bold green]")
        console.print(
            "[dim]Keep your Master Password safe. It cannot be recovered.[/dim]"
        )
    except Exception as err:
        console.print(f"[bold red]Initialization failed:[/bold red] {err}")
        sys.exit(1)


@cli.command("add")
@click.option(
    "--service", prompt="Service / Domain name (e.g. github.com)", help="Service name"
)
@click.option("--username", prompt="Username / Email", help="Account identifier")
@click.option(
    "--password", default=None, help="Account password (leave empty to generate)"
)
@click.option("--url", default="", help="Website URL")
@click.option("--notes", default="", help="Additional notes")
@click.option(
    "--path", type=click.Path(), default=None, help="Custom path for vault file"
)
def add_cmd(service, username, password, url, notes, path):
    """Add or update credentials in the vault."""
    vault_path = Path(path) if path else get_default_vault_path()

    if not vault_path.exists():
        console.print(
            "[bold red]Error:[/bold red] Vault not found. Run [cyan]lockpy init[/cyan] first."
        )
        sys.exit(1)

    master_pass = click.prompt("Master Password", hide_input=True)

    try:
        vault_data = load_vault(vault_path, master_pass)
    except StorageError as err:
        console.print(f"[bold red]Failed to open vault:[/bold red] {err}")
        sys.exit(1)

    if not password:
        if Confirm.ask("Generate a secure password automatically?"):
            password = generate_secure_password(length=20)
            console.print(f"Generated Password: [bold green]{password}[/bold green]")
        else:
            password = click.prompt("Enter Account Password", hide_input=True)

    entries = vault_data.setdefault("entries", {})
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    entries[service] = {
        "username": username,
        "password": password,
        "url": url,
        "notes": notes,
        "updated_at": now_iso,
    }

    try:
        save_vault(vault_path, vault_data, master_pass)
        console.print(
            f"[bold green]✔ Credentials saved for '[yellow]{service}[/yellow]'![/bold green]"
        )
    except Exception as err:
        console.print(f"[bold red]Failed to save vault:[/bold red] {err}")
        sys.exit(1)


@cli.command("get")
@click.argument("service")
@click.option("--show-password", is_flag=True, help="Display password in terminal")
@click.option(
    "--path", type=click.Path(), default=None, help="Custom path for vault file"
)
def get_cmd(service, show_password, path):
    """Retrieve credentials for a service."""
    vault_path = Path(path) if path else get_default_vault_path()

    if not vault_path.exists():
        console.print("[bold red]Error:[/bold red] Vault file not found.")
        sys.exit(1)

    master_pass = click.prompt("Master Password", hide_input=True)

    try:
        vault_data = load_vault(vault_path, master_pass)
    except StorageError as err:
        console.print(f"[bold red]Authentication failed:[/bold red] {err}")
        sys.exit(1)

    entries = vault_data.get("entries", {})
    entry = entries.get(service)

    if not entry:
        console.print(
            f"[bold red]No entry found for service:[/bold red] [yellow]{service}[/yellow]"
        )
        sys.exit(1)

    pwd = entry.get("password", "")
    copied = copy_with_autowipe(pwd, timeout_seconds=15)

    display_pwd = pwd if show_password else "••••••••••••••••"

    table = Table(title=f"Credentials: {service}", border_style="cyan")
    table.add_column("Field", style="bold white")
    table.add_column("Value", style="bold green")

    table.add_row("Service", service)
    table.add_row("Username", entry.get("username", ""))
    table.add_row("Password", display_pwd)
    if entry.get("url"):
        table.add_row("URL", entry.get("url"))
    if entry.get("notes"):
        table.add_row("Notes", entry.get("notes"))
    table.add_row("Updated At", entry.get("updated_at", ""))

    console.print(table)

    if copied:
        console.print(
            "[bold green]✔ Password copied to clipboard! Will auto-wipe in 15 seconds.[/bold green]"
        )
    else:
        console.print("[yellow]Notice: Clipboard functionality unavailable.[/yellow]")


@cli.command("list")
@click.option(
    "--path", type=click.Path(), default=None, help="Custom path for vault file"
)
def list_cmd(path):
    """List all stored services."""
    vault_path = Path(path) if path else get_default_vault_path()

    if not vault_path.exists():
        console.print("[bold red]Error:[/bold red] Vault file not found.")
        sys.exit(1)

    master_pass = click.prompt("Master Password", hide_input=True)

    try:
        vault_data = load_vault(vault_path, master_pass)
    except StorageError as err:
        console.print(f"[bold red]Authentication failed:[/bold red] {err}")
        sys.exit(1)

    entries = vault_data.get("entries", {})

    if not entries:
        console.print(
            "[dim]Vault is empty. Use [cyan]lockpy add[/cyan] to insert credentials.[/dim]"
        )
        return

    table = Table(title=f"Vault Items ({len(entries)})", border_style="bright_blue")
    table.add_column("Service", style="cyan bold")
    table.add_column("Username", style="yellow")
    table.add_column("URL", style="dim blue")
    table.add_column("Updated At", style="dim green")

    for svc_name, item in sorted(entries.items()):
        table.add_row(
            svc_name,
            item.get("username", ""),
            item.get("url", ""),
            item.get("updated_at", "")[:19].replace("T", " "),
        )

    console.print(table)


@cli.command("generate")
@click.option("--length", "-l", default=20, help="Password length")
@click.option("--no-symbols", is_flag=True, help="Exclude special symbols")
@click.option("--no-numbers", is_flag=True, help="Exclude digits")
@click.option("--copy", "-c", is_flag=True, help="Copy to clipboard with 15s auto-wipe")
def generate_cmd(length, no_symbols, no_numbers, copy):
    """Generate a random strong password."""
    pwd = generate_secure_password(
        length=length, include_symbols=not no_symbols, include_numbers=not no_numbers
    )
    console.print(
        Panel(
            f"[bold green]{pwd}[/bold green]",
            title="Generated Password",
            border_style="magenta",
        )
    )

    if copy:
        copied = copy_with_autowipe(pwd, timeout_seconds=15)
        if copied:
            console.print(
                "[bold green]✔ Copied to clipboard! Auto-wiping in 15 seconds.[/bold green]"
            )


@cli.command("gui")
@click.option(
    "--path", type=click.Path(), default=None, help="Custom path for vault file"
)
def gui_cmd(path):
    """Launch the LockPy Vault Graphical User Interface (GUI)."""
    from vault.gui.app import run_gui

    vault_path = Path(path) if path else get_default_vault_path()
    run_gui(vault_path=vault_path)


def main():
    cli()


if __name__ == "__main__":
    main()
