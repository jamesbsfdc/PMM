/*
 *
 *  * Copyright (c) 2020, salesforce.com, inc.
 *  * All rights reserved.
 *  * SPDX-License-Identifier: BSD-3-Clause
 *  * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 *
 */

import { LightningElement, api, track } from "lwc";

const MULTI_SELECT_DELIM = ";";

export default class Picklist extends LightningElement {
    // Expects an object with a label and the salesforce picklistValue object
    @api value;
    @api type = "radio";
    @api multiSelect = false;

    @track options;
    _picklist;

    @api
    get picklist() {
        return this._picklist;
    }

    set picklist(value) {
        this._picklist = value;
        this.setOptions();
    }

    get label() {
        return this.picklist && this.picklist.label ? this.picklist.label : undefined;
    }

    get selection() {
        return this.options.filter(option => option.isSelected);
    }

    get valueAsArray() {
        return this.value ? this.value.split(MULTI_SELECT_DELIM) : [];
    }

    setOptions() {
        this.options = this.picklist.picklistValues.map(picklistValue => {
            let isSelected =
                picklistValue.isSelected ||
                (!this.value && picklistValue.defaultValue) ||
                this.valueAsArray.includes(picklistValue.value);

            if (isSelected && !this.value) {
                this.value = picklistValue.value;
            }

            return {
                value: picklistValue.value,
                label: picklistValue.label,
                isSelected: isSelected,
            };
        });
    }

    handleChange(event) {
        this.options.forEach(option => {
            option.isSelected = option.value === event.detail.value;
        });

        this.dispatchSelection();
    }

    handleMultiSelectClick(event) {
        this.options.forEach(option => {
            if (option.value === event.target.name) {
                option.isSelected = !option.isSelected;
            }
        });

        this.dispatchSelection();
    }

    dispatchSelection() {
        this.dispatchEvent(new CustomEvent("select", { detail: this.selection }));
    }
}
