"""
LockPy Vault - CustomTkinter Modern Dark GUI
Provides a sleek, responsive Desktop application for managing encrypted credentials.
"""

import datetime
from pathlib import Path
from typing import Optional, Dict, Any

import customtkinter as ctk

from vault.core.crypto import generate_secure_password
from vault.core.memory import wipe_string_reference
from vault.core.storage import (
    get_default_vault_path,
    init_vault,
    load_vault,
    save_vault,
    StorageError,
)
from vault.cli.clipboard import copy_with_autowipe

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")


class LockPyGUI(ctk.CTk):
    """Main CustomTkinter Window for LockPy Vault."""

    def __init__(self, vault_path: Optional[Path] = None):
        super().__init__()

        self.title("Encrypted Vault - Zero-Knowledge Password Manager")
        self.geometry("900 x 600")
        self.minsize(800, 550)

        self.vault_path = Path(vault_path) if vault_path else get_default_vault_path()
        self.master_password: Optional[str] = None
        self.vault_data: Optional[Dict[str, Any]] = None

        self.main_container = ctk.CTkFrame(
            self, corner_radius=0, fg_color="transparent"
        )
        self.main_container.pack(fill="both", expand=True)

        self.show_login_screen()

    def clear_container(self):
        """Clears all widgets inside the main container."""
        for widget in self.main_container.winfo_children():
            widget.destroy()

    # ==========================================
    # LOGIN / INITIALIZATION SCREEN
    # ==========================================

    def show_login_screen(self):
        """Displays the unlock / initialization screen."""
        self.clear_container()

        card = ctk.CTkFrame(
            self.main_container, width=420, height=450, corner_radius=16
        )
        card.place(relx=0.5, rely=0.5, anchor="center")

        title_label = ctk.CTkLabel(
            card,
            text="🔐 Encrypted Vault",
            font=ctk.CTkFont(size=26, weight="bold"),
            text_color="#38bdf8",
        )
        title_label.pack(pady=(35, 5))

        subtitle_label = ctk.CTkLabel(
            card,
            text="Zero-Knowledge Local Security",
            font=ctk.CTkFont(size=13, slant="italic"),
            text_color="#94a3b8",
        )
        subtitle_label.pack(pady=(0, 25))

        exists = self.vault_path.exists()
        prompt_text = (
            "Enter Master Password to Unlock:"
            if exists
            else "Create Master Password to Initialize:"
        )

        prompt_lbl = ctk.CTkLabel(
            card, text=prompt_text, font=ctk.CTkFont(size=13), text_color="#f8fafc"
        )
        prompt_lbl.pack(pady=(10, 5), padx=30, anchor="w")

        self.password_entry = ctk.CTkEntry(
            card,
            show="•",
            width=340,
            height=40,
            placeholder_text="Master Password",
            font=ctk.CTkFont(size=14),
        )
        self.password_entry.pack(pady=(0, 15), padx=30)
        self.password_entry.bind("<Return>", lambda event: self.handle_auth())

        self.login_status = ctk.CTkLabel(
            card, text="", font=ctk.CTkFont(size=12), text_color="#ef4444"
        )
        self.login_status.pack(pady=(0, 10))

        btn_text = "Unlock Vault" if exists else "Initialize New Vault"
        auth_btn = ctk.CTkButton(
            card,
            text=btn_text,
            width=340,
            height=42,
            font=ctk.CTkFont(size=14, weight="bold"),
            fg_color="#0284c7",
            hover_color="#0369a1",
            command=self.handle_auth,
        )
        auth_btn.pack(pady=(5, 20))

        path_lbl = ctk.CTkLabel(
            card,
            text=f"Vault: {self.vault_path}",
            font=ctk.CTkFont(size=10),
            text_color="#64748b",
            wraplength=340,
        )
        path_lbl.pack(pady=(10, 15))

    def handle_auth(self):
        """Processes unlock or creation of vault."""
        password = self.password_entry.get().strip()
        if not password:
            self.login_status.configure(
                text="Please enter a master password.", text_color="#ef4444"
            )
            return

        try:
            if self.vault_path.exists():
                self.vault_data = load_vault(self.vault_path, password)
            else:
                self.vault_data = init_vault(self.vault_path, password)

            self.master_password = password
            self.show_dashboard()
        except StorageError as err:
            self.login_status.configure(
                text=f"Auth failed: {err}", text_color="#ef4444"
            )

    # ==========================================
    # DASHBOARD SCREEN
    # ==========================================

    def show_dashboard(self):
        """Displays the main vault dashboard layout."""
        self.clear_container()

        # Left Sidebar Navigation
        sidebar = ctk.CTkFrame(
            self.main_container, width=200, corner_radius=0, fg_color="#0f172a"
        )
        sidebar.pack(side="left", fill="y")

        brand_lbl = ctk.CTkLabel(
            sidebar,
            text="🔐 LockPy",
            font=ctk.CTkFont(size=20, weight="bold"),
            text_color="#38bdf8",
        )
        brand_lbl.pack(pady=(25, 30), padx=20, anchor="w")

        nav_btn_vault = ctk.CTkButton(
            sidebar,
            text="🔑 My Vault",
            anchor="w",
            height=38,
            fg_color="transparent",
            hover_color="#1e293b",
            command=self.show_vault_view,
        )
        nav_btn_vault.pack(fill="x", padx=10, pady=4)

        nav_btn_add = ctk.CTkButton(
            sidebar,
            text="➕ Add Entry",
            anchor="w",
            height=38,
            fg_color="transparent",
            hover_color="#1e293b",
            command=self.show_add_entry_view,
        )
        nav_btn_add.pack(fill="x", padx=10, pady=4)

        nav_btn_gen = ctk.CTkButton(
            sidebar,
            text="🎲 Generator",
            anchor="w",
            height=38,
            fg_color="transparent",
            hover_color="#1e293b",
            command=self.show_generator_view,
        )
        nav_btn_gen.pack(fill="x", padx=10, pady=4)

        lock_btn = ctk.CTkButton(
            sidebar,
            text="🔒 Lock Vault",
            anchor="w",
            height=38,
            fg_color="#991b1b",
            hover_color="#7f1d1d",
            command=self.lock_vault,
        )
        lock_btn.pack(side="bottom", fill="x", padx=10, pady=20)

        # Right Content View Area
        self.content_area = ctk.CTkFrame(
            self.main_container, corner_radius=0, fg_color="#1e293b"
        )
        self.content_area.pack(side="right", fill="both", expand=True)

        self.show_vault_view()

    def clear_content_area(self):
        """Clears the right content area."""
        for widget in self.content_area.winfo_children():
            widget.destroy()

    def lock_vault(self):
        """Wipes master password and returns to login screen."""
        if self.master_password:
            wipe_string_reference(self.master_password)
        self.master_password = None
        self.vault_data = None
        self.show_login_screen()

    # ------------------------------------------
    # VIEWS: VAULT LIST VIEW
    # ------------------------------------------

    def show_vault_view(self):
        """Displays stored services with search bar and action buttons."""
        self.clear_content_area()

        header_frame = ctk.CTkFrame(self.content_area, fg_color="transparent")
        header_frame.pack(fill="x", padx=25, pady=(20, 10))

        title = ctk.CTkLabel(
            header_frame,
            text="Credentials Vault",
            font=ctk.CTkFont(size=22, weight="bold"),
            text_color="#f8fafc",
        )
        title.pack(side="left")

        self.toast_label = ctk.CTkLabel(
            header_frame, text="", font=ctk.CTkFont(size=12), text_color="#10b981"
        )
        self.toast_label.pack(side="right")

        # Search Bar
        search_frame = ctk.CTkFrame(self.content_area, fg_color="transparent")
        search_frame.pack(fill="x", padx=25, pady=(0, 15))

        self.search_entry = ctk.CTkEntry(
            search_frame,
            placeholder_text="🔍 Search service or username...",
            height=38,
            font=ctk.CTkFont(size=13),
        )
        self.search_entry.pack(fill="x")
        self.search_entry.bind("<KeyRelease>", lambda e: self.render_entries_list())

        # Scrollable list container
        self.scroll_list = ctk.CTkScrollableFrame(
            self.content_area, fg_color="transparent"
        )
        self.scroll_list.pack(fill="both", expand=True, padx=25, pady=(0, 20))

        self.render_entries_list()

    def render_entries_list(self):
        """Renders filtered cards into the scrollable container."""
        for w in self.scroll_list.winfo_children():
            w.destroy()

        entries = self.vault_data.get("entries", {}) if self.vault_data else {}
        query = (
            self.search_entry.get().strip().lower()
            if hasattr(self, "search_entry")
            else ""
        )

        filtered = {
            name: data
            for name, data in entries.items()
            if not query
            or query in name.lower()
            or query in data.get("username", "").lower()
        }

        if not filtered:
            empty_lbl = ctk.CTkLabel(
                self.scroll_list,
                text="No credentials found.",
                font=ctk.CTkFont(size=14, slant="italic"),
                text_color="#64748b",
            )
            empty_lbl.pack(pady=40)
            return

        for service_name, item in sorted(filtered.items()):
            card = ctk.CTkFrame(self.scroll_list, corner_radius=10, fg_color="#0f172a")
            card.pack(fill="x", pady=6, ipady=4)

            # Left Info
            info_frame = ctk.CTkFrame(card, fg_color="transparent")
            info_frame.pack(side="left", padx=15, pady=10, fill="both", expand=True)

            svc_title = ctk.CTkLabel(
                info_frame,
                text=service_name,
                font=ctk.CTkFont(size=16, weight="bold"),
                text_color="#38bdf8",
                anchor="w",
            )
            svc_title.pack(fill="x")

            usr_sub = ctk.CTkLabel(
                info_frame,
                text=f"User: {item.get('username', '')}",
                font=ctk.CTkFont(size=12),
                text_color="#94a3b8",
                anchor="w",
            )
            usr_sub.pack(fill="x")

            # Right Buttons
            btn_frame = ctk.CTkFrame(card, fg_color="transparent")
            btn_frame.pack(side="right", padx=15, pady=10)

            pwd = item.get("password", "")

            copy_btn = ctk.CTkButton(
                btn_frame,
                text="📋 Copy Pass",
                width=100,
                height=32,
                fg_color="#0284c7",
                hover_color="#0369a1",
                command=lambda p=pwd: self.action_copy_password(p),
            )
            copy_btn.pack(side="left", padx=4)

            del_btn = ctk.CTkButton(
                btn_frame,
                text="🗑 Delete",
                width=80,
                height=32,
                fg_color="#b91c1c",
                hover_color="#991b1b",
                command=lambda s=service_name: self.action_delete_entry(s),
            )
            del_btn.pack(side="left", padx=4)

    def action_copy_password(self, password: str):
        """Copies password and updates toast message."""
        copied = copy_with_autowipe(password, timeout_seconds=15)
        if copied and hasattr(self, "toast_label"):
            self.toast_label.configure(
                text="✔ Copied! Clipboard will auto-wipe in 15s",
                text_color="#10b981",
            )
            self.after(4000, lambda: self.toast_label.configure(text=""))

    def action_delete_entry(self, service_name: str):
        """Removes entry from vault data and saves atomically."""
        if self.vault_data and "entries" in self.vault_data:
            self.vault_data["entries"].pop(service_name, None)
            save_vault(self.vault_path, self.vault_data, self.master_password)
            self.render_entries_list()

    # ------------------------------------------
    # VIEWS: ADD ENTRY VIEW
    # ------------------------------------------

    def show_add_entry_view(self):
        """Form for adding a new credential."""
        self.clear_content_area()

        title = ctk.CTkLabel(
            self.content_area,
            text="Add New Credential",
            font=ctk.CTkFont(size=22, weight="bold"),
            text_color="#f8fafc",
        )
        title.pack(anchor="w", padx=25, pady=(20, 15))

        form_frame = ctk.CTkFrame(
            self.content_area, corner_radius=12, fg_color="#0f172a"
        )
        form_frame.pack(fill="both", expand=True, padx=25, pady=(0, 20))

        # Fields
        ctk.CTkLabel(
            form_frame, text="Service Name / Domain*", font=ctk.CTkFont(size=12)
        ).pack(anchor="w", padx=25, pady=(15, 2))
        svc_entry = ctk.CTkEntry(
            form_frame, placeholder_text="e.g. github.com", height=36
        )
        svc_entry.pack(fill="x", padx=25, pady=(0, 10))

        ctk.CTkLabel(
            form_frame, text="Username / Email*", font=ctk.CTkFont(size=12)
        ).pack(anchor="w", padx=25, pady=(5, 2))
        usr_entry = ctk.CTkEntry(
            form_frame, placeholder_text="user@example.com", height=36
        )
        usr_entry.pack(fill="x", padx=25, pady=(0, 10))

        ctk.CTkLabel(form_frame, text="Password*", font=ctk.CTkFont(size=12)).pack(
            anchor="w", padx=25, pady=(5, 2)
        )
        pwd_frame = ctk.CTkFrame(form_frame, fg_color="transparent")
        pwd_frame.pack(fill="x", padx=25, pady=(0, 10))

        pwd_entry = ctk.CTkEntry(
            pwd_frame, placeholder_text="Account password", height=36, show="•"
        )
        pwd_entry.pack(side="left", fill="x", expand=True, padx=(0, 8))

        def gen_pass():
            p = generate_secure_password(length=20)
            pwd_entry.delete(0, "end")
            pwd_entry.insert(0, p)
            pwd_entry.configure(show="")

        gen_btn = ctk.CTkButton(
            pwd_frame,
            text="🎲 Generate",
            width=100,
            height=36,
            fg_color="#0284c7",
            hover_color="#0369a1",
            command=gen_pass,
        )
        gen_btn.pack(side="right")

        ctk.CTkLabel(
            form_frame, text="Website URL (Optional)", font=ctk.CTkFont(size=12)
        ).pack(anchor="w", padx=25, pady=(5, 2))
        url_entry = ctk.CTkEntry(form_frame, placeholder_text="https://...", height=36)
        url_entry.pack(fill="x", padx=25, pady=(0, 15))

        status_lbl = ctk.CTkLabel(form_frame, text="", font=ctk.CTkFont(size=12))
        status_lbl.pack(pady=(0, 10))

        def save_action():
            svc = svc_entry.get().strip()
            usr = usr_entry.get().strip()
            pwd = pwd_entry.get().strip()
            url = url_entry.get().strip()

            if not svc or not usr or not pwd:
                status_lbl.configure(
                    text="Please fill in all required fields (*)", text_color="#ef4444"
                )
                return

            now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
            self.vault_data.setdefault("entries", {})[svc] = {
                "username": usr,
                "password": pwd,
                "url": url,
                "notes": "",
                "updated_at": now_iso,
            }
            save_vault(self.vault_path, self.vault_data, self.master_password)
            self.show_vault_view()

        save_btn = ctk.CTkButton(
            form_frame,
            text="💾 Save Credential",
            height=42,
            font=ctk.CTkFont(size=14, weight="bold"),
            fg_color="#10b981",
            hover_color="#059669",
            command=save_action,
        )
        save_btn.pack(fill="x", padx=25, pady=(5, 20))

    # ------------------------------------------
    # VIEWS: GENERATOR VIEW
    # ------------------------------------------

    def show_generator_view(self):
        """Password Generator View."""
        self.clear_content_area()

        title = ctk.CTkLabel(
            self.content_area,
            text="Password Generator",
            font=ctk.CTkFont(size=22, weight="bold"),
            text_color="#f8fafc",
        )
        title.pack(anchor="w", padx=25, pady=(20, 15))

        gen_card = ctk.CTkFrame(self.content_area, corner_radius=12, fg_color="#0f172a")
        gen_card.pack(fill="both", expand=True, padx=25, pady=(0, 20))

        output_entry = ctk.CTkEntry(
            gen_card,
            height=48,
            font=ctk.CTkFont(size=18, weight="bold"),
            text_color="#10b981",
            justify="center",
        )
        output_entry.pack(fill="x", padx=25, pady=(25, 20))

        # Slider Length
        len_label = ctk.CTkLabel(
            gen_card, text="Password Length: 20", font=ctk.CTkFont(size=14)
        )
        len_label.pack(pady=(5, 5))

        slider = ctk.CTkSlider(gen_card, from_=8, to=64, number_of_steps=56)
        slider.set(20)
        slider.pack(fill="x", padx=40, pady=(0, 20))

        def on_slider(value):
            len_label.configure(text=f"Password Length: {int(value)}")
            do_generate()

        slider.configure(command=on_slider)

        # Options Switches
        sw_symbols = ctk.CTkSwitch(
            gen_card, text="Include Special Symbols (!@#$)", font=ctk.CTkFont(size=13)
        )
        sw_symbols.select()
        sw_symbols.pack(pady=6)

        sw_numbers = ctk.CTkSwitch(
            gen_card, text="Include Numbers (0-9)", font=ctk.CTkFont(size=13)
        )
        sw_numbers.select()
        sw_numbers.pack(pady=6)

        def do_generate():
            length_val = int(slider.get())
            sym = bool(sw_symbols.get())
            num = bool(sw_numbers.get())
            p = generate_secure_password(
                length=length_val, include_symbols=sym, include_numbers=num
            )
            output_entry.delete(0, "end")
            output_entry.insert(0, p)

        sw_symbols.configure(command=do_generate)
        sw_numbers.configure(command=do_generate)

        toast_gen = ctk.CTkLabel(
            gen_card, text="", font=ctk.CTkFont(size=12), text_color="#10b981"
        )
        toast_gen.pack(pady=(15, 5))

        def copy_gen():
            p = output_entry.get()
            if p:
                copy_with_autowipe(p, timeout_seconds=15)
                toast_gen.configure(
                    text="✔ Password copied! Clipboard will auto-wipe in 15s"
                )
                self.after(3000, lambda: toast_gen.configure(text=""))

        copy_btn = ctk.CTkButton(
            gen_card,
            text="📋 Copy & Auto-Wipe (15s)",
            height=42,
            font=ctk.CTkFont(size=14, weight="bold"),
            fg_color="#0284c7",
            hover_color="#0369a1",
            command=copy_gen,
        )
        copy_btn.pack(fill="x", padx=40, pady=(10, 20))

        do_generate()


def run_gui(vault_path: Optional[Path] = None):
    """Launches the LockPy CustomTkinter GUI application."""
    app = LockPyGUI(vault_path=vault_path)
    app.mainloop()
