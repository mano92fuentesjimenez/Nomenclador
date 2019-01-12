
(function() {
    var comps = AjaxPlugins.Ext3_components,
        buttons = comps.buttons,
        utils = Genesig.Utils,
        nom = AjaxPlugins.Nomenclador,
        errorMsg = comps.Messages.slideMessage.error,
        info = comps.Messages.slideMessage.info,
        enums = nom.enums,
        addW = AjaxPlugins.Ext3_components.Windows.AddModWindow;

    var INSERTED = 1,
        MODIFIED = 2,
        DELETED = 3,
        insertedCssClass = 'enum_inserted_grid_row',
        modifiedCssClass = 'enum_modified_grid_row',
        removeCssClass = 'enum_removed_grid_row',
        _enumButtons= {
            rmBtn: 'rmBtn',
            modBtn:'modBtn',
            addBtn:'addBtn',
            cancelBtn:'cancelBtn',
            submitBtn:'submitBtn'
        };
    nom.interfaces.writterBtns = _enumButtons;

    nom.interfaces.EnumStoreWriter = Ext.extend(nom.interfaces.EnumStoreReader, {

		//config
		showColors:true,

		//privates
		submitButton: null,
		cancelChangesButton: null,
		updateStore: null,
		hasLoadedBoolean: null,
		totalCount: null,
		manageEnum:true,
        selectEnum:false,

		dataEditor: null,

        dataEditorConfig:null,
        selections:null,
        constructor: function (config) {
            var self = this;
            this.addEvents({
                /**
                 * Event that is called before records are deleted, so they could be stopped from removing. To not remove a
                 * record, remove it from records param
                 * @param records
                 */
                'before_submit_del_records':true,
                /**
                 * Event that is called before records are modified, so they could be stopped from modifying. To not modify
                 * a record, remove it from records param. You can also remodify a modified record.
                 * @param records
                 */
                'before_submit_mod_records':true,
                /**
                 * Event that is called before record are added, so they could be stopped from modifying. To not add a record
                 * remove it from records param, you can also add other properties.
                 * @param records
                 */
                'before_submit_add_records':true,
                /**
                 * Event that is fired after changes has been submited to the server.
                 */
                'changessubmited':true,
                /**
                 * Event that is fired when a record is mark as added to store
                 */
                'recordAdded':true,
                /**
                 * Event that is fired when a record is mark as modified in the store
                 */
                'recordModified':true,
                /**
                 * Event that is fired when a record is mark as deleted in the store
                 */
                'recordDeleted':true
            });

            this.manageEnum = (config && config.manageEnum !==undefined) ? config.manageEnum : this.manageEnum;
            if( this.manageEnum)
                this.__buttonsConfig = {
                    addBtn:{
                        text: "",
                        tooltip: 'Adicionar datos',
                        handler: function () {
                            self.dataEditor.showEditor(null, function (recordObj) {
                                if(self.fieldFilter)
                                    recordObj[self.fieldFilter] = self.fieldFilterValue;
                                var record = self.createNewRecord(recordObj);
                                self.store.add(record);
                                self.fireEvent('recordAdded',record);
                            });
                        }
                    },
                    modBtn:{
                        text:'',
                        tooltip: 'Modificar datos',
                        handler: function(){
                            var selection = self.getSelection();
                            if(selection._length_()> 0 )
                                self.modifyRecord(selection._first_());
                        }
                    },
                    rmBtn:{
                        disabled: true,
                        text: '',
                        tooltip: "Eliminar datos",
                        handler: function () {
                            var selection = self.getSelection();
                            selection._each_(function (v, k) {
                                self.store.remove(v);
                            });
                            self.fireEvent('recordDeleted', selection);
                        }
                    },
                    cancelBtn:{
                        tooltip: "Limpiar Cambios",
                        iconCls: "gis_limpiar",
                        text: '',
                        handler: function () {
                            self.cancelChanges();
                            self.refreshView();
                        }
                    },
                    submitBtn:{
                        tooltip: "Guardar Cambios",
                        iconCls: "gis_guardar",
                        text: '',
                        handler: this.submitChanges,
                        scope: this
                    }
                };

            this.__eventsConfig = {
                'recorddblclick':this.recorddblclick
            };

            nom.interfaces.EnumStoreWriter.superclass.constructor.apply(this, arguments);

            if(this.columns.indexOf(nom.Type.Revision.UNIQUE_ID)=== -1)
                this.columns.push(nom.Type.Revision.UNIQUE_ID);
            this.configureStore();
            this.on('storeinitialized', function () {
                this.configureStore();
            }, this);

            var instanceConfig = this.enumInstance.getInstanceConfig(),
                formDataEditor = instanceConfig.getFormDataEditor(this._enum.tpl);

            this.dataEditor= this.createEditor(formDataEditor ? formDataEditor : nom.FormDataEditor_Default);

        },
        createEditor : function(classObject){
            return new classObject(this.enumInstance, this._enum, this.columns, this.dataEditorConfig);
        },
        configureStore: function () {
            var self = this;
            if(this.offlineMode)
                return;
            var changes = {mod: {}, del: {}, add: {}};
            self.store.changes = changes;

            var add = self.store.add;
            self.store.add = function (record) {
                record.state = INSERTED;
                changes["add"][record.id] = record;
                add.call(this, record);
                self.refreshView();
                //Ext.data.Store.add.call(this,record);
            };
            self.store.oldRemove = self.store.remove;
            self.store.remove = function (record, all) {
                if (record.state == INSERTED) {
                    delete changes['add'][record.id];
                    self.store.oldRemove(record);
                    return;
                }
                record.state = DELETED;
                changes["del"][record.id] = record;
                if (!all)
                    self.refreshView();
            };
            self.store.removeAll = function (record) {
                self.store.each(self.store.remove, true);
            };
            var commit = self.store.commitChanges;
            self.store.commitChanges = function () {
                commit.apply(this, arguments);
                changes = {del: {}, mod: {}, add: {}};
                var toDel = [];
                self.store.each(function (record) {
                    if (record.state == DELETED)
                        toDel.push(record);
                    record.state = undefined;
                });
                toDel.map(function (record) {
                    self.store.oldRemove(record);
                });
                self.refreshView();
            };
            self.store.getChanges = function () {
                return changes;
            };
            self.store.hasChanges = function () {
                return Object.keys(changes.mod).length != 0 ||
                    Object.keys(changes.del).length != 0 ||
                    Object.keys(changes.add).length != 0;
            };
            self.store.getRawChanges = function () {
                var r = {mod: [], del: {}, add: {}};
                for (var record in changes.add)
                    r.add[record] = changes.add[record].data;
                for (var record in changes.del)
                    r.del[record] = changes.del[record].data;
                for (var record in changes.mod)
                    if (Ext.util.JSON.encode(record.modified) != "{}") {
                        var modified =changes.mod[record].modified,
                            data = changes.mod[record].data,
                            recordToPush = {};
                        modified._each_(function(v,k){
                            recordToPush[k]=data[k];
                        });
                        recordToPush[nom.Type.PrimaryKey.UNIQUE_ID] = data[nom.Type.PrimaryKey.UNIQUE_ID];
                        recordToPush[nom.Type.Revision.UNIQUE_ID] = data[nom.Type.Revision.UNIQUE_ID];
                        r.mod.push(recordToPush);
                    }

                return r;
            };
            self.store.oldRejectChanges = self.store.rejectChanges;
            self.store.rejectChanges = function (recordsIds) {
                if(recordsIds._length_() === 0)
                    recordsIds = null;
                for (var key in changes.add) {
                    if(recordsIds && recordsIds.indexOf(key) === -1)
                        continue;
                    self.store.oldRemove(changes.add[key]);
                    delete changes.add[key];
                }
                self.store.oldRejectChanges();
                for (var key in changes.mod) {
                    if(recordsIds && recordsIds.indexOf(key) === -1)
                        continue;
                    changes.mod[key].state = undefined;
                    delete changes.mod[key];
                }
                for (var key in changes.del) {
                    if(recordsIds && recordsIds.indexOf(key) === -1)
                        continue;
                    changes.del[key].state = undefined;
                    delete changes.del[key];
                }
                self.refreshView();
            };

            self.store.on('update', function (s, record, v) {
                if (v == Ext.data.Record.EDIT) {
                    if (record.state == INSERTED ||
                        record.modified._queryBy_(function (v) {
                            v != undefined
                        }).length > 0)
                        return;
                    record.state = MODIFIED;
                    changes["mod"][record.id] = record;
                    self.refreshView();
                }
            });
        },
        cancelChanges: function () {
            this.store.rejectChanges(this.getSelection()._map_(function (v) {
                return v.id;
            }));
        },
        submitChanges: function () {
            var changes = this.store.getRawChanges();
            var mask  = this.getMaskObj('Subiendo cambios.'),
                self = this;
            if(!this.offlineMode) {
                this.fireEvent('before_submit_del_records',changes['del']);
                this.fireEvent('before_submit_add_records',changes['add']);
                this.fireEvent('before_submit_mod_records',changes['mod']);
                nom.request('submitChanges', {
                    instanceName: this.enumInstance,
                    data: changes,
                    modelRevision: this._enum.modelRevision,
                    modelId: this._enum.id,
                    actions: this.getActions()
                   }, function (response, o) {
                    changes['add'] = response.add;
                    if (self.fireEvent('changessubmited', changes) === false)
                        return;
                    if (response.delMsg) {
                        errorMsg("Error eliminando datos", response.delMsg);
                        return;
                    }
                    //TODO: Adicionar interdaz para controlar versiones por records cuando se eliminan y modifican los mismos
                    if (utils.isArray(response.underRevision) && response.underRevision.length > 0) {
                        info('Implementar mecanismo para aceptar los cambios viejos por los nuevos, No se aceptaron los cambios en los records desactualizados');
                    }
                    self.store.commitChanges();
                    self.reloadCurrentPage()
                }, null, mask/*,true*/);
            }
            else setTimeout(function(){
                self.store.commitChanges();
            }, 0)
        },
        hasChanges: function () {
            return this.store && this.store.hasChanges && this.store.hasChanges();
        },

        recorddblclick:function(record){
            if(this.manageEnum && !this.selectEnum)
                this.modifyRecord(record);
            else
                nom.interfaces.EnumStoreWriter.superclass.recorddblclick.call(this,record);
        },
        createNewRecord : function(data){
            return new this.store.recordType(data);
        },
        updateRecordFieldValue : function(record,field,newValue){
            record.set(field, newValue);
        },
        modifyRecord: function (record) {
            var self = this;
            this.dataEditor.showEditor(record.data, function (recordObj) {
                record.beginEdit();
                recordObj._each_(function (v, k) {
                    self.updateRecordFieldValue(record,k,v);
                });
                record.endEdit();
                self.fireEvent('recordModified', record);

            })
        },
        getRowClassFunc: function (record) {
			if(!this.showColors)
				return undefined;
			return function (record) {
				var cssClass = record.id;
				if (record.state == undefined)
					return cssClass;
				if (record.state == INSERTED)
					return insertedCssClass + ' ' + cssClass;
				if (record.state == DELETED)
					return removeCssClass + ' ' + cssClass;
				if (record.state == MODIFIED)
					return modifiedCssClass + ' ' + cssClass;
				return "";
			};

        },
        reconfigure: function () {
            nom.interfaces.EnumStoreWriter.superclass.reconfigure.apply(this, arguments);
            this.configureStore();
        },
        onSelectionChange:function(records){
            nom.interfaces.EnumStoreWriter.superclass.onSelectionChange.call(this,records);
            var rmBtn = this.getButtonInstance(_enumButtons.rmBtn),
                modBtn = this.getButtonInstance(_enumButtons.modBtn);
            if(rmBtn)
                this.setButtonDisabled(rmBtn, records && records._length_() ==0);
            if(modBtn)
                this.setButtonDisabled(modBtn, records && records._length_() ==0);
        },

        /**
         * TO OVERRIDE
         */
        selectRecord:function(record){
            Logger.error('La funcion selectRecord no fue sobrescrita')
        },
        /**
         * Refrescar solo la vista sin modificar los datos
         */
        refreshView : function(){
            Logger.error('La funcion refreshView no fue sobrescrita')
        }

    });
})();