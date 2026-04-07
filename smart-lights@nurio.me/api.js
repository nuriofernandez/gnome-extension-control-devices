import Soup from 'gi://Soup';
import GLib from 'gi://GLib';

import {API_BASE, AUTH_TOKEN} from './settings.js';

export default class ApiClient {
    constructor() {
        this._httpSession = new Soup.Session();
        this._httpSession.timeout = 5;
    }

    destroy() {
        this._httpSession = null;
    }

    async getDevices() {
        const message = Soup.Message.new('GET', `${API_BASE}/`);
        message.get_request_headers().append('Authorization', `Bearer ${AUTH_TOKEN}`);

        const bytes = await this._httpSession.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
        return JSON.parse(new TextDecoder().decode(bytes.get_data()));
    }

    async deviceStatus(id) {
        const message = Soup.Message.new('GET', `${API_BASE}/${id}`);
        message.get_request_headers().append('Authorization', `Bearer ${AUTH_TOKEN}`);

        const bytes = await this._httpSession.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
        return JSON.parse(new TextDecoder().decode(bytes.get_data()));
    }

    async sendAction(id, action) {
        const message = Soup.Message.new('POST', `${API_BASE}/${id}/${action}`);
        message.get_request_headers().append('Authorization', `Bearer ${AUTH_TOKEN}`);
        await this._httpSession.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
    }
}
