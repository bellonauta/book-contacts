sap.ui.define([
    "sap/ui/core/ComponentContainer"
], function (ComponentContainer) {
	"use strict";

	new ComponentContainer({
		name: "sap.ui.core.tutorial.odatav4",
		settings : {
			id: "odatav4"
		},
		async: true
	}).placeAt("content");
});