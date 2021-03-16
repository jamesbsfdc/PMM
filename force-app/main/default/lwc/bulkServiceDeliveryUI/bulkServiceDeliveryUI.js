/*
 *
 *  * Copyright (c) 2020, salesforce.com, inc.
 *  * All rights reserved.
 *  * SPDX-License-Identifier: BSD-3-Clause
 *  * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 *
 */

import { LightningElement, api, track, wire } from "lwc";
import { NavigationMixin } from "lightning/navigation";
import { handleError } from "c/util";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { loadStyle } from "lightning/platformResourceLoader";

import { ServiceDeliveryFieldSets } from "./serviceDeliveryFieldSets";

import addServiceDelivery from "@salesforce/label/c.Add_Service_Delivery";
import done from "@salesforce/label/c.Done";
import addEntry from "@salesforce/label/c.Add_Entry";
import saved from "@salesforce/label/c.Saved";
import saving from "@salesforce/label/c.Saving";
import success from "@salesforce/label/c.Success";
import serviceDeliveriesAdded from "@salesforce/label/c.Service_Deliveries_Added";
import Label_Required from "@salesforce/label/c.Required";
import rowsWithErrors from "@salesforce/label/c.Rows_With_Errors";

import CONTACT_FIELD from "@salesforce/schema/ServiceDelivery__c.Contact__c";
import QUANTITY_FIELD from "@salesforce/schema/ServiceDelivery__c.Quantity__c";
import UNITMEASUREMENT_FIELD from "@salesforce/schema/ServiceDelivery__c.UnitOfMeasurement__c";
import PROGRAM_ENGAGEMENT_FIELD from "@salesforce/schema/ServiceDelivery__c.ProgramEngagement__c";
import SERVICE_FIELD from "@salesforce/schema/ServiceDelivery__c.Service__c";
import SERVICEDELIVERY_OBJECT from "@salesforce/schema/ServiceDelivery__c";

import getFieldSets from "@salesforce/apex/FieldSetController.getFieldSetByName";

import pmmFolder from "@salesforce/resourceUrl/pmm";

const FIELD_SET_NAME = "Bulk_Service_Deliveries";

export default class BulkServiceDeliveryUI extends NavigationMixin(LightningElement) {
    @api defaultValues;
    @api hideFooter = false; // no longer used; can't remove because public
    @track serviceDeliveries = [{ index: 0 }];
    @track fieldSet = [];
    @track errors = {};
    serviceDeliveryFieldSets;
    saveMessage;
    serviceDeliveryObject = SERVICEDELIVERY_OBJECT;
    rowCount = this.serviceDeliveries.length;
    isSaving = false;
    isAddEntryDisabled = false;
    isDoneDisabled = false;
    hasContactField = false;
    hasProgramEngagementField = false;
    hideWizard = false;

    labels = {
        addEntry: addEntry,
        addServiceDelivery: addServiceDelivery,
        done: done,
        saved: saved,
        saving: saving,
        required: Label_Required,
        success: success,
        serviceDeliveriesAdded: serviceDeliveriesAdded,
        rowsWithErrors: rowsWithErrors,
    };
    fields = {
        contact: CONTACT_FIELD,
        unitMeasurement: UNITMEASUREMENT_FIELD,
        quantity: QUANTITY_FIELD,
        programEngagement: PROGRAM_ENGAGEMENT_FIELD,
        service: SERVICE_FIELD,
    };
    _deliveryIndex = 1;

    @wire(getFieldSets, {
        objectName: SERVICEDELIVERY_OBJECT.objectApiName,
    })
    wiredFields({ error, data }) {
        if (data) {
            this.serviceDeliveryFieldSets = new ServiceDeliveryFieldSets(data);
            this.fieldSet = this.serviceDeliveryFieldSets.getFieldSet(FIELD_SET_NAME);
            this.hasContactField = this.serviceDeliveryFieldSets.hasContactField(
                FIELD_SET_NAME
            );
            this.hasProgramEngagementField = this.serviceDeliveryFieldSets.hasProgramEngagementField(
                FIELD_SET_NAME
            );
        } else if (error) {
            handleError(error);
        }
    }

    @api
    resetUI() {
        this.showRowCountToast();
        this.defaultValues = {};
        this.serviceDeliveries = [];
        this.addDelivery();
    }

    connectedCallback() {
        loadStyle(this, pmmFolder + "/bsdtOverrides.css");
        loadStyle(this, pmmFolder + "/hideHelpIcons.css");

        this.serviceDeliveryPage = {
            type: "standard__objectPage",
            attributes: {
                objectApiName: "ServiceDelivery__c",
                actionName: "home",
            },
        };
        this[NavigationMixin.GenerateUrl](this.serviceDeliveryPage).then(
            url => (this.url = url)
        );
    }

    addDelivery() {
        this.serviceDeliveries.push({ index: this._deliveryIndex });
        this._deliveryIndex++;
        this.rowCount = this.serviceDeliveries.length;
    }

    handleDelete(event) {
        this.serviceDeliveries = this.serviceDeliveries.filter(function(obj) {
            return obj.index !== event.detail;
        });
        if (this.serviceDeliveries.length <= 0) {
            this.addDelivery();
        }
        this.handleDeleteError(event.detail);
    }

    handleDone() {
        this.resetUI();
        this.dispatchEvent(new CustomEvent("done"));
    }

    handleRowError(event) {
        let errorIndex = event.detail.index;
        this.errors[errorIndex] = "error";
        this.isAddEntryDisabled = false;
        this.renderErrors();
    }

    handleDeleteError(index) {
        if (this.errors[index]) {
            delete this.errors[index];
            this.renderErrors();
            this.setDoneDisabled();
        }
    }

    handleSubmit() {
        this.isAddEntryDisabled = true;
        this.isDoneDisabled = true;
    }

    handleSuccess(event) {
        this.isAddEntryDisabled = false;

        let rowIndex = event.target.index;
        let serviceDelivery = this.serviceDeliveries.find(
            ({ index }) => index === rowIndex
        );
        serviceDelivery.hasSaved = true;
        this.handleDeleteError(rowIndex);

        this.setDoneDisabled();
    }

    handleHideWizard() {
        this.hideWizard = true;
    }

    setDoneDisabled() {
        if (Object.keys(this.errors).length > 0) {
            this.isDoneDisabled = true;
        } else {
            this.isDoneDisabled = false;
        }
    }

    renderErrors() {
        this.errors = Object.assign({}, this.errors);
    }

    showRowCountToast() {
        let count = 0;
        this.serviceDeliveries.forEach(element => {
            if (element.hasSaved) {
                count++;
            }
        });
        if (count > 0) {
            let toastMessage = count + " " + this.labels.serviceDeliveriesAdded;

            this[NavigationMixin.GenerateUrl]({
                type: "standard__objectPage",
                attributes: {
                    objectApiName: this.serviceDeliveryObject.objectApiName,
                    actionName: "home",
                },
            }).then(url => {
                const event = new ShowToastEvent({
                    title: this.labels.success,
                    variant: "success",
                    mode: "sticky",
                    message: "{0}",
                    messageData: [
                        {
                            url,
                            label: toastMessage,
                        },
                    ],
                });
                this.dispatchEvent(event);
            });
        }
    }

    get doneTitleLabel() {
        if (this.isDoneDisabled) {
            return this.labels.rowsWithErrors;
        }
        return this.labels.done;
    }
}
