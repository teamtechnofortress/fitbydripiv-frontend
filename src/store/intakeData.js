import { postRequestNoAuth } from "@/network";
import {
    SAVE_INTAKE1_URL,
    SAVE_INTAKE2_URL,
    SAVE_INTAKE3_URL,
} from "@/network/const";
import { defineStore } from "pinia";

export const useIntakeDataStore = defineStore('intakeData', {
    state: () => ({
        saveIntakeResult: null,
        intake1IDNumber: null,
        loading: false,
        error: null,
    }),
    actions: {
        saveIntake1(params) {
            //
            this.error = null;
            this.loading = true;
            this.saveIntakeResult = null;
            postRequestNoAuth(SAVE_INTAKE1_URL, null, params, (response) => {
                let res = response.data.success;
                if (res) {
                    const data = response.data;
                    this.saveIntakeResult = data.message.id;//patient id
                    this.intake1IDNumber  = data.message.intake1_id;
                    this.error = null;
                    this.loading = false;
                } else {
                    let err_msg = response.data.err_msg;
                    let error = {
                        code: "Save Intake Data Failed",
                        message: err_msg
                    };

                    //
                    this.error = error;
                    this.loading = false;
                }
            });
        },        
        saveIntake2(params) {
            //
            this.error = null;
            this.loading = true;
            this.saveIntakeResult = null;
            postRequestNoAuth(SAVE_INTAKE2_URL, null, params, (response) => {
                let res = response.data.success;
                if (res) {
                    const data = response.data.data;
                    this.saveIntakeResult = data;
                    this.error = null;
                    this.loading = false;
                } else {
                    let err_msg = response.data.err_msg;
                    let error = {
                        code: "Save Intake Data Failed",
                        message: err_msg
                    };

                    //
                    this.error = error;
                    this.loading = false;
                }
            });
        },        
        saveIntake3(params) {
            //
            this.error = null;
            this.loading = true;
            this.saveIntakeResult = null;
            postRequestNoAuth(SAVE_INTAKE3_URL, null, params, (response) => {
                let res = response.data.success;
                if (res) {
                    const data = response.data.data;
                    this.saveIntakeResult = data;
                    this.error = null;
                    this.loading = false;
                } else {
                    let err_msg = response.data.err_msg;
                    let error = {
                        code: "Save Intake Data Failed",
                        message: err_msg
                    };

                    //
                    this.error = error;
                    this.loading = false;
                }
            });
        },        
    }
});