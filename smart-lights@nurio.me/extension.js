import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Pango from 'gi://Pango';
import GLib from 'gi://GLib';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import ApiClient from './api.js';
import Device from './device.js';

export default class SmartLightExtension extends Extension {
    enable() {
        this._apiClient = new ApiClient();
        this._devices = new Map();

        this._indicator = new PanelMenu.Button(0.0, "Light Controller", false);
        let icon = new St.Icon({
            icon_name: 'display-brightness-symbolic',
            style_class: 'system-status-icon',
        });
        this._indicator.add_child(icon);

        // Container for the "iOS-style" grid
        this._mainView = new St.BoxLayout({
            vertical: true,
            style_class: 'light-grid'
        });

        let item = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        item.add_child(this._mainView);
        this._indicator.menu.addMenuItem(item);

        this._timeoutId = null;

        this._indicator.menu.connect('open-state-changed', (menu, isOpen) => {
            if (isOpen) {
                if (!this._timeoutId) {
                    this.refreshStatus();
                    this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 5000, () => {
                        this.refreshStatus();
                        return GLib.SOURCE_CONTINUE;
                    });
                }
            } else {
                if (this._timeoutId) {
                    GLib.Source.remove(this._timeoutId);
                    this._timeoutId = null;
                }
            }
        });

        this._buildMenu();
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = null;
        }
        this._isRefreshing = false;
        this._indicator?.destroy();
        this._indicator = null;
        if (this._apiClient && typeof this._apiClient.destroy === 'function') {
            this._apiClient.destroy();
        }
        this._apiClient = null;
        this._devices = null;
    }

    async refreshStatus() {
        if (this._isRefreshing) return;
        this._isRefreshing = true;

        try {
            const updates = [];
            this._devices.forEach((device) => {
                updates.push(device.updateStatus());
            });
            await Promise.allSettled(updates);
        } finally {
            this._isRefreshing = false;
        }
    }

    async _buildMenu() {
        try {
            const devicesData = await this._apiClient.getDevices();

            this._mainView.destroy_all_children();
            this._devices.clear();

            let currentRow;
            devicesData.forEach((deviceData, index) => {
                let device = new Device(this._apiClient, deviceData.id, deviceData.name);
                this._devices.set(device.id, device);

                if (index % 2 === 0) {
                    currentRow = new St.BoxLayout({
                        vertical: false,
                        x_expand: true,
                        style_class: 'light-row'
                    });
                    this._mainView.add_child(currentRow);
                }

                let buttonBox = new St.BoxLayout({ vertical: true, x_expand: true });
                buttonBox.add_style_class_name('light-button-box');

                let btn = new St.Button({
                    style_class: 'light-button',
                    child: new St.Icon({ icon_name: 'display-brightness-symbolic', icon_size: 20 }),
                    x_expand: true,
                    reactive: true,
                    can_focus: true,
                });

                let label = new St.Label({
                    text: device.name,
                    style_class: 'light-label'
                });
                label.clutter_text.ellipsize = Pango.EllipsizeMode.END;
                label.x_align = Clutter.ActorAlign.CENTER;

                device.onStatusChanged = (status) => {
                    if (status) {
                        btn.add_style_class_name('light-button-active');
                    } else {
                        btn.remove_style_class_name('light-button-active');
                    }
                };

                // Trigger initial status fetch which will update the UI
                device.updateStatus();

                btn.connect('clicked', () => device.toggle());

                buttonBox.add_child(btn);
                buttonBox.add_child(label);
                currentRow.add_child(buttonBox);
            });

        } catch (e) {
            console.error(`[Smart-Lights] Error: ${e.message}`);
            this._mainView.add_child(new St.Label({
                text: `Error: ${e.message}`,
                style: 'color: #ff5555; padding: 10px;'
            }));
        }
    }

}
