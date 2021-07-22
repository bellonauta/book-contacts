sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Sorter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType"
], function (Controller, MessageBox, MessageToast, JSONModel, Sorter, Filter, FilterOperator, FilterType) {
	"use strict";

	// Constantes para box de mensagens...
	var _mbkSuccess = "s",
		_mbkError = "e",
		_mbkWarning = "w";

	// Constante para ações de manutenção...
    var _maInsert = 'i',
	    _maUpdate = 'u',
		_maDelete = 'd',
		_maNone = 'n';

	return Controller.extend("sap.ui.core.tutorial.odatav4.controller.App", {		

		/**
		 *  Hook for initializing the controller
		 */
		onInit : function () {
			var oViewModel = new JSONModel({
					busy : false,
					hasUIChanges : false,
					action : _maNone,
					order : 0,
					rowSelected : -1,
					token : false,
					contacts : []
				});

            this._book = [];         							

			oViewModel.setProperty('/contacts', this._book);

			this.getView().setModel(oViewModel, "appView");			
			
			this._bTechnicalErrors = false;
		},

		onAfterRendering : function() {
			var me = this,
			    oViewModel = me.getView().getModel("appView");

			me.byId("contactsTable").setModel(oViewModel);   	 
            
			me._request(function() {							
				me._loadContacts();
			});		
		},	
	

		/* =========================================================== */
		/*           begin: event handlers                             */
		/* =========================================================== */


		/**
		 * Create a new entry.
		 */	
		onCreate : function () {	
			var me = this,
			    oViewModel = me.getView().getModel("appView");

			if (me._hasUIChanges()) {
				me._msgBox(me._getText("pendingChangesMessage"), _mbkWarning, null, 
				    function() {
				     	me._selectRow(oViewModel.getProperty("/rowSelected"));
			    	});   			
				return;
			}	
			
			me._book.push({"Email" : "", "Name" : "", "Phone" : ""});
			oViewModel.setProperty('/contacts', me._book);
		    oViewModel.refresh();//which will add the new record

			me._setUIChanges(true);
			me._setAction(_maInsert);	

			me._disableRowEdition(me._getRowSelected());

			// Select and focus the table row that contains the newly created entry
    	    me._selectRowByEmail("");			
		    me._enableRowEdition(me._getRowSelected(), true);
		},	

		/**
		 * Delete an entry.
		 */
		onDelete : function () {
			var me = this,
			    oViewModel = me.getView().getModel("appView");

			if (me._hasUIChanges() && me._getAction() !== _maInsert) {
				me._msgBox(me._getText("pendingChangesMessage"), _mbkWarning, null, 
				    function() {
					    me._selectRow(oViewModel.getProperty("/rowSelected"));
				    });   		
				return;
			}	

			if (me._getRowSelected() < 0) {
				me._msgBox(me._getText("noContactSelected"), _mbkError);
 			    return;
			}  

			if (me._getAction() !== _maInsert) {
			    // Somente inserções podem ser excluídas...	
				me._msgBox(me._getText("deletionNotAllowed"), _mbkWarning);
		    } else {
				// Exclui a row inserida...
				me._book.splice(me._getRowSelected()); 
	
				oViewModel.setProperty('/contacts', me._book);
				oViewModel.refresh(); 
				me._unselectAllRows();
				me._setUIChanges(false);
				me._setAction(_maNone);
				me._msgBox(me._getText("deletionSuccessMessage"), _mbkSuccess);
			 }	 
		},


		/**
		 * Lock UI when changing data in the input controls
		 * @param {sap.ui.base.Event} oEvt - Event data
		 */
		onInputChange : function (oEvt) {
			if (this._getAction() == _maNone) {
				this._setUIChanges(true);
				this._setAction(_maUpdate);	
			}			
		},

		/**
		 * Refresh the data.
		 */
		onRefresh : function () {
			var me = this;
			me._request(function() {							
				me._loadContacts();
			});	
		},

		/**
		 * Reset any unsaved changes.
		 */
		onResetChanges : function () {
			var me = this;
			me._request(function() {							
				me._loadContacts(false);
			});	
		},

		onTableSelectionChange : function(table) {
			var me = this,
			    oSelected = me.byId("contactsTable").getSelectedItem(),
				rowSelected = me._getRowIndexByItem(oSelected);

			if (me._hasUIChanges() && me._getRowSelected() >= 0 && me._getRowSelected() != rowSelected) {			   	
			    //Seleção com pendências - Avisa e retorna para a row com pendências...
				me._selectRow(me._getRowSelected()); // Retorna o foco para a row correta
			    me._msgBox(me._getText("pendingChangesMessage"), _mbkWarning, null, 
				    function() {
						me._selectRow(me._getRowSelected()); // Retorna o foco para a row correta
					});   
			    return false;
			}

			try {
			   // Desativa edição da row anterior... 
        	   me._disableRowEdition(me._getRowSelected());
			   // Ativa a edição na row selecionada...
			   me._enableRowEdition(rowSelected, false);
			} finally { 
			   me._setRowSelected(rowSelected); //Registra
			   me._setUIChanges(false);
			   me._setAction(_maNone);
			}  
		},		

		/**
		 * Save changes to the source.
		 */
		onSave : function () {
			var me = this;

			if (me._getRowSelected() < 0) {
				return false;
			}

			if (!me._validate()) return false;

			if (me._getAction() == _maInsert) {
				me._request(function() {
			    	me._insertContact();
				});		
			} else {
				me._request(function() {
					me._updateContact();
				});	
			}

			return true;
		},

		/**
		 * Search for the term in the search field.
		 */
		onSearch : function () {
			var me = this;

			if (me._hasUIChanges()) {
				me._msgBox(me._getText("pendingChangesMessage"), _mbkWarning, null, 
				    function() {
				     	me._selectRow(oViewModel.getProperty("/rowSelected"));
			    	});   			
				return;
			}	

			if (me._getRowSelected() >= 0) {
			   me._disableRowEdition(me._getRowSelected());	
			   me._unselectRow(me._getRowSelected());						
			}   

			var oView = me.getView(),
				sValue = oView.byId("searchField").getValue(),
				oFilter = new Filter("Name", FilterOperator.Contains, sValue);

			oView.byId("contactsTable").getBinding("items").filter(oFilter, FilterType.Application);
		},

		/**
		 * Sort the table according to the last name.
		 * Cycles between the three sorting states "none", "ascending" and "descending"
		 */
		onSort : function () {
			var me = this;

			if (me._hasUIChanges()) {
				me._msgBox(me._getText("pendingChangesMessage"), _mbkWarning, null, 
				    function() {
				     	me._selectRow(oViewModel.getProperty("/rowSelected"));
			    	});   			
				return;
			}	

			var oView = me.getView(),
				aStates = ["pk", "asc", "desc"],
				aStateTextIds = ["sortNone", "sortAscending", "sortDescending"],			
				iOrder = oView.getModel("appView").getProperty("/order");

			// Cycle between the states
			iOrder = (iOrder + 1) % aStates.length;
			var sOrder = aStates[iOrder];

			me._request(function() {
				me._loadContacts(true, sOrder,
					function(success) {
						if (success) {
							oView.getModel("appView").setProperty("/order", iOrder);
				        	var sMessage = me._getText("sortMessage", [me._getText(aStateTextIds[iOrder])]);
			            	MessageToast.show(sMessage);
						}		
  				    });	
			});	
		},
	

		/* =========================================================== */
		/*           end: event handlers                               */
		/* =========================================================== */

		_getXhrResponseMessage : function(xhr) {			
			var message = xhr.status;
			if (xhr.responseJSON && xhr.responseJSON !== "") {
			    if (typeof xhr.responseJSON === "object" && xhr.responseJSON["message"] !== undefined) {
					message += " - "+xhr.responseJSON.message;	
			    } else {   
				    message += " - "+xhr.responseJSON;
			    }   
			} else {
				message += " - "+xhr.statusText;
			}	
			return message;
		},

        _getApiToken : function(fn) {
			var me = this,
			    oViewModel = me.getView().getModel("appView");

			oViewModel.setProperty('/token', false);
			
			$.ajax({
					url: me.getOwnerComponent().getManifestEntry("/sap.app/dataSources/contacts/authentication/url"),	
					type: "POST",
					headers: {
						"Content-Type" : "application/x-www-form-urlencoded"				
					},
					data: {
						"grant_type" : "password", 
						"username" : me.getOwnerComponent().getManifestEntry("/sap.app/dataSources/contacts/authentication/username")
					},	

					success: function(data, textStatus, jqXHR) {	
						 var token = data; // Object
						 token['birthDate'] = new Date();
						 oViewModel.setProperty('/token', token);
						 /* RETORNO(em 07/2021):
						    {
					     		"access_token": "eWofFyFRekcJ-925uYLuRh9NW6NNHjtBSAT8wFhI4SmUSCZ5RSIAv3HMZiAL2l9Ra-7qFb3hkbwucFhPuwih_Uc85HhNsGJHxgF2N38m22qLUehqPGAEB4Pg_WxXRbl1LO_rt8NJmslbJpx0wesOLdQjl9YeIA1BuuLKkjjQFGGKTceG4NXYd_4oxA3w1sJVi6q-ZgViERpXICuNrqR9VpkE8R34lXiWFaDmR0FrIAKqvJzXw7ytYAFT3yfYXdgnbjJFmSBS22MRmkWm244XaI_baQPZaTXTLWvvKh4wi_UepfctvOobfmgjX4gmGb9K",
				    	 		"token_type": "bearer",
					    		"expires_in": 7199
							}
					  	 */

					     if (fn) fn(true,"",token);		
					},

					error: function(xhr, status) { 													
						if (fn) fn(false, me._getXhrResponseMessage(xhr), false);		
					},
				
					complete: function(xhr, status) {										                    
					}
			});		
		},

		/**
		 * Executa um request para a API.
		 * 
		 * @param {function} fn Função JS do request que será executado.
		 */
		_request : function(fn) {
			var me = this,
			    oViewModel = me.getView().getModel("appView"),
			    token = oViewModel.getProperty('/token'),
				expired = true;

		    if (token) {  		
				// Verifica se o token ainda é válido...
			    var now = new Date(),
				    expiration = new Date();
				expiration.setSeconds(token.birthDate.getSeconds() + parseInt(token.expires_in));
				if (now < expiration) {
				    expired	= false;
				}		
			}		   

			if (token === false || expired) {
                //Solicita outro token...
				me._getApiToken(function(success, message, token) {
					if (!success) {
						me._msgBox(me._getText("authenticationFailedMessage"), _mbkError);						 
					} else if (fn) {
						fn();
					}
			    });
			} else if (fn) {
                fn();
			}			
		},
		

        /**
		 * Recarrega os contatos.		 
		 * @param {boolean}   checkChanges Se true, não permite a carga se houver alterações não salvas.
		 * @param {string}    order "pk"=Emails na ascendente, "asc"=Nomes na ascendente, "desc"=Nomes na descrescene
		 * @param {function}  fn Função de callback(Recebe o status(bool) do request)
		 * @returns none
		 */
		_loadContacts : function(checkChanges, order, fn) {			
			var me = this,
			    oViewModel = me.getView().getModel("appView"),
				token = oViewModel.getProperty('/token');

			if (checkChanges && me._hasUIChanges()) {
				me._msgBox(me._getText("pendingChangesMessage"), _mbkError, null, 
				    function() {
				  	   me._selectRow(oViewModel.getProperty("/rowSelected"));
				    });   
				return;
			}	

			me._unselectAllRows();
			
			me._book = [];         				
			oViewModel.setProperty('/contacts', me._book);
			oViewModel.refresh();

			me._setBusy(true);			
			me._setUIChanges(false);
			
			me._request(function() {
				$.ajax({
					url: me.getOwnerComponent().getManifestEntry("/sap.app/dataSources/contacts/uri") + "list",				
					type: "POST",
					dataType: "json",
					contentType: "application/json",						
					headers: { 
						"Authorization": token.token_type +" "+ token.access_token,
					},		
					data: JSON.stringify({"Skip":0, "Take":100, "Order":order || "pk"}),	

					success: function(data, textStatus, jqXHR) {	
						 for (var c in data) {
						     me._book[c] = {							 
							     "Email" : data[c].email,
								 "Name" : data[c].name,
								 "Phone" : data[c].phone
							 };  
						}	
						if (fn) fn(true);	
					},

					error: function(xhr, status) { 								
						me._msgBox(me._getXhrResponseMessage(xhr), _mbkError,
						   function() {
						      if (fn) fn(false);
						   });	  
					},
				
					complete: function(xhr, status) {	
						me._setBusy(false);			
						
	                    if (xhr.status == 200 && me._book.length > 0) {
  						   oViewModel.setProperty('/contacts', me._book);
						   oViewModel.refresh();					
						}   

						me._setUIChanges(false);	
						me._setRowSelected(-1);
						me._setAction(_maNone);		
					}
				});
			});
		},

		_validateName : function(value) {
			var valid = true;

			if (value == '') {
				valid = false;
				this._msgBox(this._getText("emptyFieldValue", [this._getText("nameLabelText")]), _mbkError);  
			} else if (value.length < 8) {
				valid = false;
				this._msgBox(this._getText("invalidFieldLength", [this._getText("nameLabelText")]), _mbkError);  
			}		
            
			return valid;
		},

		_validateEmail : function(value) {
			var valid = true;

			if (value == '') {
				valid = false;
				this._msgBox(this._getText("emptyFieldValue", [this._getText("emailLabelText")]), _mbkError); 
			} else if (value.length < 7) {
				valid = false;
				this._msgBox(this._getText("invalidFieldLength", [this._getText("emailLabelText")]), _mbkError); 
			}		
            
			return valid;
		},

		_validatePhone : function(value) {
			var valid = true;

			if (value == '') {
				valid = false;
				this._msgBox(this._getText("emptyFieldValue", [this._getText("phoneLabelText")]), _mbkError); 
			} else if (value.length < 13 || value.length > 14) { //(99)99999-9999
				valid = false;
				this._msgBox(this._getText("invalidFieldLength", [this._getText("phoneLabelText")]), _mbkError); 
			}		
            
			return valid;
		},

		_validate : function() {
			var valid = true;

			if (this._getRowSelected() < 0) {
				return;
			}

			var oViewModel = this.getView().getModel("appView"),
			    contact = oViewModel.getProperty("/contacts")[this._getRowSelected()];

			contact.Name = contact.Name.trim();
			contact.Email = contact.Email.trim();
			contact.Phone = contact.Phone.trim();

			valid = this._validateName(contact.Name);

			valid = valid && this._validateEmail(contact.Email);

			valid = valid && this._validatePhone(contact.Phone);

			return valid;
		},

		_insertContact : function() {
			var me = this,
			    oViewModel = me.getView().getModel("appView"),
				token = oViewModel.getProperty("/token");

			me._setBusy(true);
			
			me._request(function() {
	            $.ajax({
					url: me.getOwnerComponent().getManifestEntry("/sap.app/dataSources/contacts/uri") + "insert",				
					type: "PUT",
					dataType: "json",
					contentType: "application/json",	
					headers: { 
						"Authorization": token.token_type +" "+ token.access_token,
					},	
					data: JSON.stringify(oViewModel.getProperty("/contacts")[me._getRowSelected()]),	

					success: function(data, textStatus, jqXHR) {
					},				

					error: function(xhr, status) { 						
						me._msgBox(me._getXhrResponseMessage(xhr), _mbkError);
					},
				
					complete: function(xhr, status) {	
						me._setBusy(false);			
						
	                    if (xhr.status == 200) {						   					
							me._disableRowEdition(me._getRowSelected());	
							me._unselectRow(me._getRowSelected());						
						    me._setAction(_maNone);	
							me._setUIChanges(false);
							me._msgBox(me._getText("changesSentMessage"), _mbkSuccess);
						}   						
					}
				});
			});
		},

		_updateContact : function() {
			var me = this,
			    oViewModel = me.getView().getModel("appView"),
				token = oViewModel.getProperty("/token");	

			me._setBusy(true);	

			me._request(function() {
            	$.ajax({
					url: me.getOwnerComponent().getManifestEntry("/sap.app/dataSources/contacts/uri") + "update",				
					type: "POST",
					dataType: "json",
					contentType: "application/json",	
					headers: { 
						"Authorization": token.token_type +" "+ token.access_token,
					},	
					data: JSON.stringify(oViewModel.getProperty("/contacts")[me._getRowSelected()]),	

					success: function(data, textStatus, jqXHR) {
					},				

					error: function(xhr, status) { 						
						me._msgBox(me._getXhrResponseMessage(xhr), _mbkError);									
					},
				
					complete: function(xhr, status) {	
						me._setBusy(false);			
						
	                    if (xhr.status == 200) {						
							me._disableRowEdition(me._getRowSelected());						
							me._unselectRow(me._getRowSelected());
						    me._setAction(_maNone);	
							me._setUIChanges(false);	
							me._msgBox(me._getText("changesSentMessage"), _mbkSuccess);   					
						}   
					}
				});
			});				
		},


		/**
		 * Convenience method for retrieving a translatable text.
		 * @param {string} sTextId - the ID of the text to be retrieved.
		 * @param {Array} [aArgs] - optional array of texts for placeholders.
		 * @returns {string} the text belonging to the given ID.
		 */
		_getText : function (sTextId, aArgs) {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sTextId, aArgs);
		},

		/**
		 * Set action type
		 * @param {string} [action] - Any constant of type _ma*
		 */
		_setAction : function (action) {
			this.getView().getModel("appView").setProperty("/action", action);
		},

		/**
		 * Return action type
		 * @returns {string} [action] - A constant of type _ma*
		 */
		_getAction : function () {
		    return this.getView().getModel("appView").getProperty("/action");
		},

		/**
		 * Return hasUIChanges flag value in View Model
		 */
    	_hasUIChanges : function() {
			return this.getView().getModel("appView").getProperty("/hasUIChanges");
		},

		/**
		 * Set hasUIChanges flag in View Model
		 * @param {boolean} [bHasUIChanges] - set or clear hasUIChanges
		 * if bHasUIChanges is not set, the hasPendingChanges-function of the OdataV4 model determines the result
		 */
		 _setUIChanges : function (bHasUIChanges) {
			if (this._bTechnicalErrors) {
				// If there is currently a technical error, then force 'true'.
				bHasUIChanges = true;
			} else if (bHasUIChanges === undefined) {
				bHasUIChanges = this.getView().getModel().hasPendingChanges();
			}
			var oModel = this.getView().getModel("appView");
			oModel.setProperty("/hasUIChanges", bHasUIChanges);
		},


		_setRowSelected : function(rowIndex) {
			var oModel = this.getView().getModel("appView");
			oModel.setProperty("/rowSelected", rowIndex);
		},

		_getRowSelected : function() {
			var oModel = this.getView().getModel("appView");
			return oModel.getProperty("/rowSelected");
		},


		/**
		 * Set busy flag in View Model
		 * @param {boolean} bIsBusy - set or clear busy
		 */
		_setBusy : function (bIsBusy) {
			var oModel = this.getView().getModel("appView");
			oModel.setProperty("/busy", bIsBusy);
		},

		/**
		 * Define o index da row comparando o item passado com
		 * cada um existente na tabela.
		 * --> NÃO ENCONTREI A PROPRIEDADE/FUNÇÃO QUE PUDESSE ME RETORNAR O INDEX DA ROW SELECIONADA.
		 * @param {object} Item de comparação 
		 * @returns {int} -1 quando não encontrar
		 */
		_getRowIndexByItem : function(item) {
			var rowIndex = -1, rows = -1;
			this.byId("contactsTable").getItems().some(function (oItem) {								
				rows++;
				if (oItem === item) {
                    rowIndex = rows;
					return true;
				}
			}); 
			return rowIndex;
		},

		_selectRowByEmail : function(email) {
			// Select and focus the table row that contains the email passed
			var me = this, index = -1;
			me.byId("contactsTable").getItems().some(function (oItem) {
				index++;
				if (oItem.getCells()[0].getValue() === email) {					
					oItem.setSelected(true);
					oItem.focus();
					oItem.getCells()[0].focus();
					me._setRowSelected(index);
					return true;
				}
			}); 
		},

		_selectRow : function(rowIndex) {
			// Select and focus the table row that contains the index passed
			var oItem = (rowIndex >= 0 && this.byId("contactsTable").getItems().length > rowIndex) 
			               ? this.byId("contactsTable").getItems()[rowIndex] 
						   : false;
			if (oItem) {     			
				oItem.setSelected(true);
				oItem.focus();
				oItem.getCells()[0].focus();
				this._setRowSelected(rowIndex);			
			}
		},

		_unselectRow : function(rowIndex) {
			// Unselect the table row that contains the index passed
			var oItem = (rowIndex >= 0 && this.byId("contactsTable").getItems().length > rowIndex) 
			               ? this.byId("contactsTable").getItems()[rowIndex] 
						   : false;
			if (oItem) {     			
				oItem.setSelected(false);
				if (this._getRowSelected() == rowIndex) {
				    // Remove o registro da row selecionada...
				    this._setRowSelected(-1);			
				}   
			}
		},

		_unselectAllRows : function() {
			this.byId("contactsTable").getItems().some(function (oItem) {	
				oItem.setSelected(false);							
			});
			// Remove o registro da row selecionada...
			this._setRowSelected(-1);	 
		},

		_enableRowEdition : function(rowIndex, emailCell) {
			//Desativa a edição das células da row...
			var oItem = (rowIndex >= 0 && this.byId("contactsTable").getItems().length > rowIndex) 
			               ? this.byId("contactsTable").getItems()[rowIndex] 
			               : false;
			if (oItem) {
				var oCells = oItem.getCells(); 
				for (var c in oCells) {
					if (emailCell || c > 0) {
					    oCells[c].setProperty('editable',true);
					}		
				}
				// Foco da edição...
				if (emailCell) {
					oCells[0].focus();	//No campo de email			  	
				} else { 
					oCells[1].focus();  //No campo de nome				  	
				}
			}		
		},

		_disableRowEdition : function(rowIndex) {
			//Ativa a edição das células da row...
			var oItem = (rowIndex >= 0 && this.byId("contactsTable").getItems().length > rowIndex) 
			               ? this.byId("contactsTable").getItems()[rowIndex] 
			               : false;
			if (oItem) {
				var oCells = oItem.getCells(); 
				for (var c in oCells) {
					oCells[c].setProperty('editable',false);
				}
			}					
		},

		/**
		 * Apresenta um box de mensagem com título, ícone e conteúdo customizáveis
		 * @param {string} msg    Texto da mensagem a ser apresentada
		 * @param {string} kind   Uma constante _mbk*
		 * @param {enum}   icon   Uma constante MessageBox.Icon.* ou null para default
		 */
		_msgBox : function(msg,kind,icon,onClose) {
			if (kind == _mbkSuccess) {
		    	MessageBox.alert(msg, {
		  	    	                      "title": this._getText("successTitle"),
				    					  "icon": icon || MessageBox.Icon.SUCCESS,
										  "onClose": onClose
					    			  });	
			} else if (kind == _mbkError) {
		    	MessageBox.alert(msg, {
		  	    	                      "title": this._getText("errorTitle"),
				    					  "icon": icon || MessageBox.Icon.ERROR,
										  "onClose": onClose
					                  });	
		    } else {
				MessageBox.alert(msg, {
									      "title": this._getText("warningTitle"),
						     			  "icon": icon || MessageBox.Icon.WARNING,
										  "onClose": onClose
			   					      });	
			}
		}

	});

});