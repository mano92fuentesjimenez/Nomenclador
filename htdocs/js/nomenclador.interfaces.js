/**
 * Created by Mano on 10/05/2017.
 */
(function(){
    var comps = AjaxPlugins.Ext3_components,
        fields = comps.fields,
        buttons = comps.buttons,
        utils = Genesig.Utils,
        /**
         * @lends AjaxPlugins.Nomenclador
         */
        nom = AjaxPlugins.Nomenclador,
        errorMsg = comps.Messages.slideMessage.error,
        enums = nom.enums,
        addW = AjaxPlugins.Ext3_components.Windows.AddModWindow,
        readerBtns = nom.interfaces.readerBtns,
        writterBtn = nom.interfaces.writterBtns;

    /**
     * Es la clase que se encarga de renderizar el formulario para anhadir y modificar datos
     * @class AjaxPlugins.Nomenclador.FormDataEditor_Default
     * @events
     *      editorCreated       Se dispara cuando se crea el formulario con los campos a editar del nomenclador
      */
    nom.FormDataEditor_Default = Ext.extend(nom.interfaces.FormDataEditor, {
        _fields : null,
        _fieldItems : null,
        _gridItems: null,
        _items: null,
        formColumns : 1,
        editorContainerConfig: null,
        prepareFields : function(data){
            var enum_fields = this.getEnumFields(),
                gridItems = [],
                fieldItems = [],
                fields = enum_fields._map_(function (pField) {
                    var type = pField.typeInstance,
                        field = type.getValueEditExtComp(this.enumInstance, pField, this._enum);

                    if (field)
                        (field.isGrid ? gridItems : fieldItems).push(field);

                    return field;
                }, this, true);

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

                nom.makeFilter(this.enumInstance.getName(), currentField, dependsField, !!data)
            }, this);

            this._fields = fields;
            this._fieldItems = fieldItems;
            this._gridItems = gridItems;
        },
        buildSimpleFieldsForm : function(){
            var columns = this.formColumns,
                cCol = 0,
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
                self = this,
                cWidth = 1 / columns;

            this._fieldItems._each_(function (field) {
                items[cCol].items.push(field);
                cCol = (cCol + 1) < columns ? cCol + 1 : 0;
            });

            return {
                layout: 'column',
                autoScroll: true,
                defaults: {
                    layout: 'form',
                    bodyStyle: 'padding:0 2.5px 0 2.5px',
                    labelAlign: 'top',
                    columnWidth: cWidth
                },
                items: items
            };
        },
        buildGridItemsForm : function(){
            if(this._gridItems.length == 0)  return false;

            return {
                layout: 'form',
                autoScroll: true,
                labelAlign: 'top',
                defaults: {
                    height: 200,
                    anchor: '100%'
                },
                items: this._gridItems
            };
        },
        getFormBody : function(data){
            this.prepareFields(data);
            var simpleFieldsForm = this.buildSimpleFieldsForm(),
                gridItemsForm = this.buildGridItemsForm();

            return {
                autoScroll:true,
                frame:true,
                layout:'form',
                items: ([simpleFieldsForm]).concat(gridItemsForm ? [gridItemsForm] : [])
            };
        },
        handleSubmitData : function(data){
            this.fireEvent('editorClosedWithData',this,data);
            return data;
        },
        showEditor: function (data, callb) {
            var self = this,
                title = (data ? "Modificar " : "Adicionar ") + (this._enum.name ? ("datos en el Nomenclador: " + this._enum.name):''),
                editorConfig = $$.check(this.editorContainerConfig,{}),
                defaultEditorConfig = {
                    // height: 400,
                    // modal: true,
                    // autoHeight: true,
                    minHeight: 50,
                    maxHeight: 400,
                    width: '25%',
                    // layout: "fit",
                    layout: "form",
                    title: title
                },
                editor = this.editorWindow = new addW($$.assign(defaultEditorConfig,editorConfig,{
                    items: [
                        this.getFormBody(data)
                    ],
                    fields: this._fields,
                    fieldsValues: data,
                    callback: function (rowData) {
                        self._fields._first_().focus();
                        callb(self.handleSubmitData(data ? rowData.modified : rowData.all));
                    }
                }));

            editor.on({
                scope:this,
                beforeclose : function () {
                    this.fireEvent('editorClosed',this,null);
                },
                afterrender : function () {
                    if($$(editor.maxHeight).isNumber()){
                        editor.body.applyStyles({
                            'overflow-y':'auto',
                            'max-height': editor.maxHeight+'px'
                        });
                    }
                    $$(function () {
                        editor.center();
                    }).delay(100);
                }
            });

            this.fireEvent('editorCreated',this,editor,data);
            editor.show();
        }

    });

    nom.GridDataEditor = Ext.extend(nom.interfaces.EnumStoreWriter, {
        gridEditor :null,
        closable :true,
        layout :'fit',
        //privates

        constructor :function (config) {
            this._apply_(config);

            this.gridButtons = this.getGridButtons();

            if(this.showTitle)
                this.title = this._enum.name;

            nom.GridDataEditor.superclass.constructor.call(this, ({items:[]})._apply_(config));
        },
        getGridButtons : function(){
            var btns = {};
            btns[writterBtn.addBtn] = buttons.btnAdicionar;
            btns[writterBtn.rmBtn] = buttons.btnDelete;
            btns[writterBtn.submitBtn] = buttons.btnGuardar;
            btns[writterBtn.cancelBtn] = buttons.btnCancelar;
            btns[writterBtn.modBtn] = buttons.btnModificar;
            return btns;
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
			var tbar = [],
                self = this;
			if(this.manageEnum) {
				tbar = [
					this.getButtonInstance(writterBtn.addBtn),
                    this.getButtonInstance(writterBtn.modBtn),
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
			tbar.push('->');
			tbar.push(this.searchField = new fields.triggerField({
                trigger2Class:'gis_search',
                tooltipsTriggers:['Limpiar b&uacute;squeda','Buscar'],
                onTrigger2Click: this.searchByDenom.createDelegate(this)
            }));
			this.searchField.on('valuecleaned',function(){
			    self.searchByDenom();
            });

			return tbar;
        },
        searchByDenom:function(){
            nom.GridDataEditor.superclass.searchByDenom.call(this,this.searchField.getValue());
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
        },
        resetPagingTotalCount: function(totalCount){
            this.pagingBar.changeTotalCount(totalCount);
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
			var value = v == null ? [] : Ext.decode(v);
			this.loadData(value);
		}

    })

})();