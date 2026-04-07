export default class Device {
    constructor(apiClient, id, name) {
        this.apiClient = apiClient;
        this.id = id;
        this.name = name;
        this.status = false;
        this.onStatusChanged = null;
    }

    async updateStatus() {
        let response = await this.apiClient.deviceStatus(this.id);
        if (response && response.dps && ("1" in response.dps || "20" in response.dps)) {
            // Check if [1] is present and boolean
            if (response.dps["1"] === true || response.dps["1"] === false) {
                this.status = response.dps["1"] === true;
            }
            // Check if [2] is present and boolean
            if (response.dps["20"] === true || response.dps["20"] === false) {
                this.status = response.dps["20"] === true;
            }
            // Report status update
            this.onStatusChanged(this.status);
        }
    }

    async toggle() {
        try {
            await this.apiClient.sendAction(this.id, this.status ? 'off' : 'on');
            this.status = !this.status;
            if (this.onStatusChanged) this.onStatusChanged(this.status);
        } catch (e) {
            console.error(`[Smart-Lights] Failed to toggle device state: ${e.message}`);
        }
    }
}