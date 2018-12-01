/**
 * Created by Mano on 10/05/2017.
 */

(function(){
    var comps = AjaxPlugins.Ext3_components,
        buttons = comps.buttons,
        utils = Genesig.Utils,
        nom = AjaxPlugins.Nomenclador,
        errorMsg = comps.Messages.slideMessage.error,
        enums = nom.enums,
        addW = AjaxPlugins.Ext3_components.Windows.AddModWindow,
        readerBtns = nom.interfaces.readerBtns,
        writterBtn = nom.interfaces.writterBtns;

    nom.FormDataEditor_Default = Ext.extend(nom.interfaces.FormDataEditor, {
        getFormBody : function(){
            var columns = 1,
                cCol = 0,
                gridItems = [],
                items = (function () {
                    var res = [],
                        c = columns;
                    while (c > 0) {
                        res.push({
                            defaults: {
                                anchor: '100%'
                            },
                            items: []
                        });
                        c--;
                    }
                    return res;
                })(),
                enum_fields = this.getEnumFields(),
                fields = enum_fields._map_(function (pField) {
                    var type = pField.typeInstance,
                        field = type.getValueEditExtComp(this.enumInstance, pField, this._enum);
                    if (field) {
                        if (field.isGrid)
                            gridItems.push(field);
                        else items[cCol].items.push(field);
                        cCol = (cCol + 1) < columns ? cCol + 1 : 0;
                    }
                    return field;
                }, this, true),
                self = this,
                cWidth = 1 / columns;

            enum_fields._queryBy_(function (pF) {
                var prop = pF.properties;
                return !!(prop && prop.filter);
            }, this, true)._each_(function (enumField, fieldId) {
                var prop = enumField.properties,
                    filter = prop.filter,
                    currentField = fields[fieldId],
                    dependsField = fields[filter];
                if (!data)
                    currentField.disable();

                nom.makeFilter(self.enumInstance.getName(), currentField, dependsField, !!data)

            }, this);
            var config = [{
                layout: 'column',
                autoScroll: true,
                defaults: {
                    layout: 'form',
                    bodyStyle: 'padding:0 2.5px 0 2.5px',
                    labelAlign: 'top',
                    columnWidth: cWidth
                },
                items: items
            }];
            if (gridItems.length > 0)
                config.push({
                    layout: 'form',
                    autoScroll: true,
                    labelAlign: 'top',
                    defaults: {
                        height: 200,
                        anchor: '100%'
                    },
                    items: gridItems
                });

            return config;
        },
        showEditor: function (data, callb) {
            var columns = 1,
                cCol = 0,
                gridItems = [],
                items = (function () {
                    var res = [],
                        c = columns;
                    while (c > 0) {
                        res.push({
                            defaults: {
                                anchor: '100%'
                            },
                            items: []
                        });
                        c--;
                    }
                    return res;
                })(),
                enum_fields = this.getEnumFields(),
                fields = enum_fields._map_(function (pField) {
                    var type = pField.typeInstance,
                        field = type.getValueEditExtComp(this.enumInstance, pField, this._enum);
                    if (field) {
                        if (field.isGrid)
                            gridItems.push(field);
                        else items[cCol].items.push(field);
                        cCol = (cCol + 1) < columns ? cCol + 1 : 0;
                    }
                    return field;
                }, this, true),
                self = this,
                cWidth = 1 / columns;

            enum_fields._queryBy_(function (pF) {
                var prop = pF.properties;
                return !!(prop && prop.filter);
            }, this, true)._each_(function (enumField, fieldId) {
                var prop = enumField.properties,
                    filter = prop.filter,
                    currentField = fields[fieldId],
                    dependsField = fields[filter];
                if (!data)
                    currentField.disable();

                nom.makeFilter(self.enumInstance.getName(), currentField, dependsField, !!data)

            }, this);
            var config = [{
                layout: 'column',
                autoScroll: true,
                defaults: {
                    layout: 'form',
                    bodyStyle: 'padding:0 2.5px 0 2.5px',
                    labelAlign: 'top',
                    columnWidth: cWidth
                },
                items: items
            }];
            if (gridItems.length > 0)
                config.push({
                    layout: 'form',
                    autoScroll: true,
                    labelAlign: 'top',
                    defaults: {
                        height: 200,
                        anchor: '100%'
                    },
                    items: gridItems
                });

            (new addW({
                height: 400,
                modal: true,
                width: '30%',
                layout: "fit",
                title: (data ? "Modificar " : "Adicionar ") + "datos en el Nomenclador: " + this._enum.name,
                items: [
                    {
                        autoScroll:true,
                        frame:true,
                        layout:'form',
                        items:config
                    }
                ],
                fields: fields,
                fieldsValues: data,
                callback: function (rowData) {
                    fields._first_().focus();
                    if (data)
                        callb(rowData.modified);
                    else
                        callb(rowData.all)
                }
            })).show();
        }

    });

    nom.GridDataEditor = Ext.extend(nom.interfaces.EnumStoreWriter, {
        gridEditor :null,
        closable :true,
        layout :'fit',
        //privates

        constructor :function (config) {
            this._apply_(config);

            this.gridButtons = {};
            this.gridButtons[writterBtn.addBtn] = buttons.btnAdicionar;
            this.gridButtons[writterBtn.rmBtn] = buttons.btnDelete;
            this.gridButtons[writterBtn.submitBtn] = buttons.btnGuardar;
            this.gridButtons[writterBtn.cancelBtn] = buttons.btnCancelar;

            if(this.showTitle)
                this.title = this._enum.name;

            nom.GridDataEditor.superclass.constructor.call(this, ({items:[]})._apply_(config));
        },
        initializeUI :function (_enum, multiSelection ) {
            var tbar = this.initializeStoreWriterButtons();

            this.gridEditor = new Ext.grid.GridPanel({
                title:this.title,
                cm: this.getCM(this.columns),
                frame: true,
                store: this.store,
                clicksToEdit: 1,
                viewConfig: {
                    forceFit: true,
                    getRowClass: this.getRowClassFunc()
                },
                tbar: tbar,
                sm:new Ext.grid.RowSelectionModel({singleSelect:!multiSelection}),
                bbar:(this.pagingBar = this.getPagingBar())
            });
            this.multiSelection = multiSelection;
            return this.gridEditor;
            // this.addMenuToColumnHeader();
        },
        initializeStoreWriterButtons: function(){
			var tbar = undefined;
			if(this.manageEnum) {
				tbar = [
					this.getButtonInstance(writterBtn.addBtn),
					this.getButtonInstance(writterBtn.rmBtn),
					{
						xtype: 'tbseparator'
					},
					// this.getButtonInstance(readerBtns.refresh),
					this.getButtonInstance(writterBtn.submitBtn),
					this.getButtonInstance(writterBtn.cancelBtn),
					{
						xtype: 'tbspacer'
					}
				];
			}
			return tbar;
        },
        getCM:function(columns){
          return nom.getColumnModelFromEnum(this.enumInstance, this._enum, true, columns);
        },
        addMenuToColumnHeader :function (){
            if (this.gridEditor.rendered) {
                var self = this;
                var getRowsData = null;
                var button =new Ext.menu.Item({
                    text :'Calcular columna',
                    itemId:'Calcular columna',
                    handler :function (){
                        var columnIndex = self.gridEditor.getView().hdCtxIndex;
                        var gridBody = self.gridEditor.body.dom;
                        var cm = self.gridEditor.getColumnModel();
                        var columnId = cm.getColumnId(columnIndex);
                        var field = cm.getColumnAt(columnIndex)._fieldDetails_;
                        var cells = gridBody.querySelectorAll('.x-grid3-td-' + columnId + ' .nomenclador_asyncLoad');
                        menu.hide();
                        cells._asyncEach_(function (pEl, key, arr, callback){
                            nom.Type.Utils.getType(field.type).asynLoad(self.enumInstance.getName(),pEl, field, callback);
                        });
                    }
                });
                var onMenuShow = function (m){
                    var column = self.gridEditor.getView().hdCtxIndex;
                    var cm = self.gridEditor.getColumnModel();
                    var getType = nom.Type.Utils.getType;
                    var field = cm.getColumnAt(column)._fieldDetails_;
                    button.setDisabled(!getType(field.type).isLazy(self.enumInstance.getName(), field));
                };
                var menu = this.gridEditor.getView().hmenu;
                menu.addSeparator();
                menu.addMenuItem(button);
                menu.on('show', onMenuShow, this);
            }
            else {
                this.gridEditor.on('afterrender', function (){
                    this.addMenuToColumnHeader();
                }, this)
            }
        },

        destroyUI: function (){
            var ui = this.getUI();
            ui.suspendEvents();
            ui.destroy();
            ui.resumeEvents();
        },
        initializeButton: function(config, button_id){
            if(button_id in this.gridButtons)
                return new (this.gridButtons[button_id])(config);
        },

        setButtonDisabled:function(buttonInstance, value){
             buttonInstance.setDisabled(value);
        },

        setTitle:function(title){
            this.title = title;
        },
        addselectionChangeEvent:function(cb, scope){
            this.gridEditor.getSelectionModel().on('selectionchange',function(t){
                cb.call(scope, t.getSelections());
            })
        },
        addrecorddblclickEvent:function(cb, scope){
            var self = this;
            this.gridEditor.on('rowdblclick',function(grid, rowNumber){
                cb.call(scope, self.store.getAt(rowNumber));
            })
        },
        adddestroyEvent:function(cb, scope){
            this.gridEditor.on('destroy',function(){
                cb.call(scope, null);
            })
        },
        refreshView:function(){
            this.gridEditor.getView().refresh();
        },
        setNewStore:function(store){
            var grid = this.gridEditor;
            if(grid.rendered && grid.getView()){
                grid.reconfigure(store, this.getCM(this.columns));
                grid.getView().getRowClass = this.getRowClassFunc();
            }else{
                grid.store = store;
                grid.columnModel = this.getCM(this.columns);
            }
        }
    })._apply_({
        columnHeaderHandler :function (el, mouseEvent){
            var enumId = el.getAttribute('enum_id'),
                fieldId = el.getAttribute('field_id'),
                instanceName = el.getAttribute('enum_instance'),
                div = document.querySelector('.nomColumnHeaderToolTip[enum_id=' + enumId + '][field_id=' + fieldId + ']');

            if (!div) {
                div = document.createElement('div');
                div.classList.add('nomColumnHeaderToolTip');
                div.setAttribute('enum_id', enumId);
                div.setAttribute('field_id', fieldId);

                document.body.appendChild(div);
                var getType = nom.Type.Utils.getType,
                    _enum = nom.enums.getEnumById(instanceName, enumId),
                    field = _enum.fields[fieldId];

                div.innerHTML = ("<div class=''>" +
                    "<div class='nomColumnHeader'><table><tr><th colspan='2'>{fieldName}</th></tr>{content}</table></div>")._format_({
                    content :getType(field.type).getColumnTypeHeader(instanceName,field),
                    fieldName :field.header,
                    closeHandler :'AjaxPlugins.Nomenclador.GridDataEditor.columnHeaderCloseHandler(this,event)'
                });

                nom.getColumnModelFromEnum.div = div;
            }
            div.style.left = mouseEvent.clientX;
            div.style.top = mouseEvent.clientY;
        },
        columnHeaderCloseHandler :function (el){
            nom.getColumnModelFromEnum.div.remove();
        },
        columnHeaderMoveHandler :function (el, mouseEvent){
            /*var div = nom.getColumnModelFromEnum.div;
            div.style.left = mouseEvent.clientX;
            div.style.top = mouseEvent.clientY;*/
        }
    });

    nom.GridOfflineDataEditor = Ext.extend(nom.GridDataEditor,{
        offlineMode:true,
		showColors:false,

        getPagingBar:function(){
            return undefined;
        },
        initializeStoreWriterButtons:function(){
            var tbar = undefined;
			if(this.manageEnum) {
				tbar = [
					this.getButtonInstance(writterBtn.addBtn),
					this.getButtonInstance(writterBtn.rmBtn)
				];
			}
			return tbar;
        },
        loadData:function(data){
            var self = this,
                f = function(){
					self.store.loadData(data);
				};
            if(!this.storeinitialized)
                this.on('storeinitialized',f);
            else f();
        },
        setNewStore:function(store) {
			var f = function(){
				this.getUI().fireEvent('datachanged');
			};

			this.on('recordAdded',f, this);
			this.on('recordDeleted',f,this);
			this.on('recordModified',f, this);
			nom.GridOfflineDataEditor.superclass.setNewStore.apply(this,arguments);
        },
		getValue: function () {
			var values = [];
			this.store.each(function (r) {
				values.push(r.data);
			});
			return Ext.encode(values);
		},
		setValue: function (v) {
			var value = v == "" ? [] : Ext.decode(v);
			this.loadData(value);
		}

    })

})();