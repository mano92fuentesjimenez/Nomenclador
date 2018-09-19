/**
 * Created by Mano on 09/05/2017.
 */
(function(){
	var comps = AjaxPlugins.Ext3_components,
		fields = comps.fields,
		buttons = comps.buttons,
		nom = AjaxPlugins.Nomenclador,
		enums = nom.enums,
		errorMsg = comps.Messages.slideMessage.error,
		utils = Genesig.Utils;


	nom.nomencladorCreator = Ext.extend(Ext.Window, {
		entityType:'nomenclador',
		width: 800,
		height: 600,
		modal: true,
		_enum: null,
		enumInstance: null,
		//Si es true solo muestra una ventana en donde se pueden especificar los campos de un modelo, pero el modelo no tiene nombre ni fuente de datos ni descripcion
		fieldsMode: false,

		//nombre del tpl q se va a usar para crear el nomenclador
		tpl:'default',
		//configuraciones de todos los tpl en esta instancia de nomenclador.
		tplConfigs:undefined,
		//Si tiene valor, es el identificador de un dataSource q se va a usar para
		defaultDataSource:null,

		//private

		rowEditing :0,
		idCount :1,
		layout :"border",
		buttonSave :null,
		creating :true,
		descriptionTextArea :null,
		typeStore :null,
		dataArray :null,
		nameTextField :null,
		gridEditor :null,
		properties :null,
		dataSourceSelector :null,
		extraProps:null,

		constructor :function (cfg){
			var self = this;
			this.enumInstance = arguments[0].enumInstance;
			this._apply_(cfg);
			this.title = 'Adicionar '+this.entityType;
			if (arguments[0]._enum) {
				this.title = 'Modificar '+this.entityType;
				this.creating = false;
				this._enum = arguments[0]._enum;
				this.enumHasData = arguments[0].enumHasData;
			}
			this.getUIConfig();
			nom.nomencladorCreator.superclass.constructor.call(this, Ext.apply(arguments[0] || {}, {
				buttons :[
					new buttons.btnCancelar({
						handler :function (){
							self.fireEvent('cancel');
							self.close();
						}
					}),
					this.buttonSave
				]
			}));
			this.addEvents({
				/**
				 * Evento que se lanza cuando se termina de crear el nomenclador.
				 * param1: Objeto de la forma { (name:fieldType)*}
				 */
				"finishedCreation" :true
			});
			this.refs = new nom.refs();
			this.refs.load(this.enumInstance, arguments[0].refs || {});
			this.on('afterrender', function (){
				this.createValidator();
			});
		},
		getUIConfig:function(){
			var self =this;
			this.buttonSave = new buttons.btnAceptar({
				disabled :true,
				handler :this.SaveAndExit, scope :this
			});
			var dbConfigStore = new Ext.data.JsonStore({
				fields :["id"],
				url :Genesig.ajax.getLightURL("Nomenclador.default") + "&action=getDbConfigs",
				baseParams:{enumInstance:this.enumInstance}
			});

			dbConfigStore.on("load", function (t, records){
				this.dataSourceSelector.setValue(records[0].get("id"));
			}, this);
			this.dataSourceSelector = new fields.triggerField({
				fieldLabel :"Fuente de datos",
				allowBlank :false,
				readOnly :true,
				tooltipsTriggers :['Limpiar', 'Seleccionar fuente de datos'],
				tooltip :'Seleccionar la fuente de datos',
				hidden: this.isDefaultDS(),
				onTrigger2Click :function (){
					new nom.dataSourcesList({
						enumInstance:self.enumInstance,
						callback :function (r){
							self.dataSourceSelector.setValue(r);
							self.dataSourceSelector.fireEvent('valuesetted');
						}
					})
				},
				isValid :function (){
					return true
				},
				getXType :function (){
					return 'dataSource';
				}
			});
			this.nameTextField = new fields.simpleField({
				allowBlank :false,
				fieldLabel :"Denominaci&oacute;n",
				tooltip:'Denominaci&oacute;n del '+this.entityType,
				validator :function (text){
					if (text.indexOf(':') !== -1)
						return "El nombre de un "+self.entityType+" no puede contener ':'";
					if (text.indexOf('-') !== -1)
						return "El nombre de un "+self.entityType+" no puede contener '-'";
					if (enums.getEnumByName(self.enumInstance, text) && (self.creating || text != self._enum.name))
						return "No pueden haber "+self.entityType+"(es) repetidos.";
					for (var _enum in enums.getEnums(self.enumInstance)){
						if (_enum === text && (self.creating || text !== self._enum.id))
							return "No puede haber un "+self.entityType+" con un nombre identico al identificador de" +
								" otro";
					}
					return true;
				}

			});
			this.descriptionTextArea = new fields.fieldDescripcion({
				enableKeyEvents :true,
				fieldLabel :"Descripci&oacute;n",
				tooltip:'Descripci&oacute;n del '+this.entityType,
				height :80
			});
			this.createGrid();
			if (!this.creating) {
				this.setEnum();
			}
			else {
				this.addFields(enums.getDefaultFields(self.enumInstance,self.tpl));
			}
			var items = [
				{
					title :"Datos generales",
					layout :"column",
					anchor :"100%",
					region:'center',
					defaults : {
						labelAlign: "top",
						columnWidth: .5,
						anchor: '100%',
						layout :'form',
						bodyStyle: 'padding:0 10px 0 10px',
						defaults: {
							anchor: "100%"
						}
					},
					items:[
						{
							items :[
								this.nameTextField,
								this.dataSourceSelector
							]
						},
						{
							items :[
								this.descriptionTextArea
							]
						},
					]
				}
			];
			var northHeigth = 150;
			var tpl = ((this.tplConfigs || {})[this.tpl] ||{});
			if( (tpl.extraProps||{})._length_()>0 )
			{
				this.extraProps = [];
				var extraProps = tpl.extraProps;
				var i = 0;
				var itemsL =[];
				var itemsR = [];

				extraProps._each_(function(v,k){
					var input = new v({propId:k});
					if(i%2 ===0)
						itemsL.push(input);
					else
						itemsR.push(input);
					self.extraProps.push(input);
					i++;
				});
				items.push({
					layout: 'column',
					title: 'Propiedades',
					region: 'south',
					height: 100,
					autoScroll: true,
					split: true,
					xtype:'fieldset',
					defaults: {
						labelAlign: "top",
						columnWidth: .5,
						anchor: '100%',
						layout: 'form',
						bodyStyle: 'padding:0 10px 0 10px',
						defaults: {
							anchor: "100%"
						}
					},
					items: [
						{
							items: itemsL
						},
						{
							items: itemsR
						}
					]
				});
				northHeigth +=100;
			}

			this.items=[];
			var defaults ={};

			this.items.push({

				frame :true,
				region :'north',
				height :northHeigth,
				collapsible :true,
				layout:'border',
				split :true,
				hidden:this.fieldsMode,
				items : items,


			});
			this.items.push( this.gridEditor);

		},
		updateFieldCounter :function (){
			// parseInt(id.substr(0,id.length-1))
			var self = this;
			this.gridStore.each(function (record){
				var id = self.idToNumber(record.get('id').toString());
				if(!isNaN(id))
					self.idCount = isNaN(self.idCount) ? id : Math.max(self.idCount, id);
				else self.idCount = isNaN(self.idCount) ? 1 :self.idCount;
			});
			this.idCount++;
		},
		getDataTypeArray :function (toExclude){
			var toExclude = this._default_(toExclude, {});
			var dataArray = [];
			var types = nom.Type.Utils.getTypesDict();
			var no_enum = Object.keys(enums.getEnums(this.enumInstance)).length;
			var configDataTypes = ((this.tplConfigs ||{})[this.tpl] || {}).dataTypes;

			for (var type in types){
				/**
				 * No anhadir ningun tipo por referencia si no hay nomencladores a los cuales se les pueda
				 * referenciar.
				 */
				if ((!no_enum && types[type].valueType == nom.Type.REF_Type) || type in toExclude)
					continue;
				//custom types are allowed in a enumInstance if configDataTypes is defined.
				if(utils.isObject(configDataTypes) && configDataTypes[type]===undefined)
					continue;

				dataArray.push([
					types[type].nameToShow,
					type,
					types[type].getPropertiesExtComp,
					types[type]

					// proto.getEditValueExtComp
				])
			}
			return dataArray;
		},
		createGrid :function (){
			var self = this,
				dataArray = this.getDataTypeArray({}),
				getType = nom.Type.Utils.getType,
				current_PropValue,
				getPropertyWindow = function (_enumId, fieldId, type) {
					if (self.properties[fieldId])
						self.properties[fieldId].destroy();
					self.properties[fieldId] = type.getPropertiesExtComp(self.enumInstance, _enumId, fieldId,  self.getFields(fieldId));

					self.properties[fieldId].on('propertynotsetted', function () {
						if (self.properties[fieldId].enum_filled)
							return;
						if (current_PropValue && type.destroyProp) {
							self.properties[fieldId] = type.getPropertiesExtComp(self.enumInstance, _enumId, fieldId, self.getFields(fieldId));
							self.properties[fieldId].setValue(self.enumInstance,current_PropValue, fieldId, _enumId);
							return;
						}
						//poner el primer campo si no se puso ninguna propiedad al cerrar la ventana.
						var t = dataArray[0][1];
						dataTypeSelector.setValue(t);
						showFilter(t);
						showMultiple(t);
						self.showPropertiesButton(t, dataTypeSelector);
						self.properties[fieldId] = undefined;
					});
					return self.properties[fieldId];
				},
				boolRender = function (text){
					return '<div class=' + (( text === undefined || text.toString() == "true") ?
						'"active-image"' :
						'"inactive-image"') + '></div>';
				},
				showMultiple = function(type){
					var t = nom.Type.Utils.getType(type),
						record = self.gridStore.getAt(self.rowEditing);

					self.multiple.setDisabled(!t.canBeMultiple || self.enumHasData || record.isDefault);
				},
				showFilter = function(type){
					var t = nom.Type.Utils.getType(type),
						record = self.gridStore.getAt(self.rowEditing);

					comboFilter.setDisabled(!t.canBeFiltered || record.isDefault);
				};

			this.typeStore = new Ext.data.ArrayStore({
				fields :['nameToShow', "type", "properties", "typeInstance"],
				data :dataArray
			});
			this.gridStore = new Ext.data.ArrayStore({
				fields :["name", "type", "needed", "id", 'fieldToFilter', 'fieldOrder','integrationProperty','multiple'],
				data :[]
			});
			this.multiple = new comps.fields.Checkbox({});
			this.rowEditing = 0;
			this.properties = [];

			var dataTypeSelector = new comps.fields.triggerComboBox({
				displayField :"nameToShow",
				valueField :"type",
				triggerAction :"all",
				lazyInit:false,
				readOnly :true,
				mode :"local",
				store :this.typeStore,
				// typeAhead: true,
				forceSelection :true,
				tooltip:'Tipo de campo',
				emptyText :"Tipo de dato",
				allowBlank :false,
				hideSecondaryTrigger :false,
				msgTarget :"qtip",
				trigger1Class :"gis_choose",
				trigger2Class :"x-form-arrow-trigger",
				onTrigger1Click :function (){
					if (this.getValue() == "")
						return;
					var t = nom.Type.Utils.getType(this.getValue());
					var record = self.gridStore.getAt(self.rowEditing);
					var id = record.get('id');
					var propertyWindow = self.properties[id];
					if (self.enumHasData && t.valueType != nom.Type.REF_Type && !(t instanceof nom.Type.Formula)) {
						if (self._enum.fields[id])
							errorMsg("Error", "No se pueden cambiar las propiedades de un campo si el "+self.entityType +
								" tiene datos.");
						return;
					}
					if (propertyWindow != null || t instanceof nom.Type.Formula) {
						var obj = propertyWindow.getValue();

						if (t.destroyProp) {
							//                            if(t instanceof nom.Type.Formula && self.properties[id] && self.properties[id].enum_filled)
							//                            {
							//                                current_PropValue = self.properties[id].getValue();
							//                            }
							propertyWindow = getPropertyWindow(self.getEnumId(), id, t);
							propertyWindow.setValue(this.enumInstance, obj, id);
						}
						propertyWindow.show(this.triggers[0]);
						if (t.valueType == nom.Type.REF_Type){

							propertyWindow.on('hide', function (){
								var obj2 = propertyWindow.getValue();
								if (!t.compareProperties(obj, obj2)) {
									comboFilter.clearValue();
									delete comboFilter.filterValueObj
								}
							})
						}
					}
				},
				isDirty :function (){
					return true;
				},
				onTrigger2Click :function (){
					if (self.enumHasData) {
						var id = self.gridStore.getAt(self.rowEditing).get("id");
						if (self._enum.fields[id]) {
							errorMsg("No puede cambiar el tipo de campo porque este "+self.entityType +
								" ya tiene datos");
							return;
						}
					}
					var record = self.gridStore.getAt(self.rowEditing);
					var fieldId = record.get('id');
					var references = self.refs.getReferences(self.enumInstance,self.getEnumId(), fieldId);
					this.canSelectEnum = true;
					if (references._length_() > 0 && !this.isExpanded()) {
						this.canSelectEnum = {
							_enum :self.refs.getEnum(references._keys_()[0]),
							field :self.refs.getField(references._keys_()[0])
						};
					}
					var v = true;
					var getType = nom.Type.Utils.getType;
					references._each_(function (value, key){
						var _enum = enums.getEnumById(self.enumInstance, self.refs.getEnum(key));
						_enum.fields._each_(function (value){
							var type = getType(value.type);
							if (!type)
								return true;
							if (type.dependsOnOthersFields && type.dependsOn(self.refs.getField(key), value.properties)) {
								var o = type.getCandidatesTypes();
								o.meta = {};
								o.meta.referencingEnum = _enum;
								o.meta.referencingField = _enum.fields[self.refs.getField(key)];
								o.meta.formulaField = value;
								dataTypeSelector.candidatesTypes = o;
							}
						});
					});
					if (v)
						comps.fields.triggerComboBox.prototype.onTrigger2Click.apply(this, arguments);
				},
				expand :function (){
					if (self.enumHasData) {
						var id = self.gridStore.getAt(self.rowEditing).get("id");
						if (self._enum.fields[id]) {
							return;
						}
					}
					if(this.editingRecord && this.editingRecord.isDenom){
						self.typeStore.filterBy(function(record){
							var t = record.get('type');

							switch (t){
								case 'DB_String':
								case 'DB_Date':
								case 'DB_EnumChooser':
								case 'DB_Number':
									return true;
							}
							return false;
						})
					}
					else{
						self.typeStore.clearFilter();
					}
					comps.fields.triggerComboBox.prototype.expand.apply(this, arguments);
				}
			});
			dataTypeSelector.on("beforeselect", function (combo, record, pos){
				var t = record.get('type');
				showMultiple(t);
				showFilter(t);

				if (record.get('type') == 'DB_Enum' && combo.canSelectEnum._isObject_()) {
					var o = combo.canSelectEnum;
					var _enum = enums.getEnumById(self.enumInstance, o._enum);
					var field = _enum.fields[o.field];
					errorMsg('No puede seleccionar el tipo nomenclador, pues este campo esta referenciado por ' +
						'el campo: "' + field.header + '" del nomenclador: "' + _enum.name + '"');
					return false;
				}
				if (combo.candidatesTypes && !(record.get('type') in combo.candidatesTypes)) {
					var t = '';
					var o = combo.candidatesTypes;
					o._each_(function (value, key){
						if (key != 'meta')
							t += ' ' + value + ',';
					});
					t = t.slice(0, -1);
					var rec = self.gridStore.getAt(self.rowEditing);
					errorMsg('El campo:"' + rec.get('name') + '" est&aacute; referenciado por el campo:"' + o.meta.referencingField.header +
						'" del nomenclador:"' + o.meta.referencingEnum.name + '", el cu&aacute; es una dependencia del campo de tipo f&oacute;' +
						'rmula:"' + o.meta.formulaField.header + '", por lo que este campo solo admite los tipos:' + t + '.');
					return false
				}
				if (!getType(record.get('type')).canBeSelected(self.enumInstance, self.getFields())) {
					return false;
				}
				var id = self.gridStore.getAt(self.rowEditing).get('id');

				if (self.properties[id]) {
					self.properties[id].destroy();
					self.properties[id] = undefined;
				}
				var _enumId = self.getEnumId();
				var fieldId = self.gridStore.getAt(self.rowEditing).get('id');
				var property = record.get("properties");
				var tInstance = record.get("typeInstance");
				if (property) {
					property = getPropertyWindow(_enumId, fieldId, tInstance);
					property.show();
					if (!tInstance.propertyNeeded)
						property.hide();
				}
				self.showPropertiesButton(record.get('type'),dataTypeSelector);
			});

			var headerEditor = new comps.fields.fieldDenom(new comps.fields.fieldDenom({
				allowBlank :false,
				tooltip:'Nombre del campo',
				validator :function (text){
					var row = 0;
					var validationMsg = false;
					self.gridStore.each(function(record){
						if(self.rowEditing == row)
							return;
						if(record.get('name') == text){
							validationMsg ='El nombre del campo no puede estar duplicado';
							return false;
						}
						row++;

					});
					if (text.indexOf(":") != -1)
						return "El nombre de un campo no puede tener ':'.";
					return validationMsg || true;
				}
			}));

			var filterStore = new Ext.data.JsonStore({
				fields :['filterId', 'filterValue'],
				data :[]
			});
			var comboFilter = new fields.triggerComboBox({
				store :filterStore,
				displayField :'filterValue',
				valueField :'filterId',
				mode :'local',
				tooltip:'Filtro de nomencladores',
				hideSecondaryTrigger :false,
				triggerAction :'all',
				trigger1Class :"gis_clear",
				trigger2Class :"x-form-arrow-trigger",
				forceSelection :false,
				onTrigger2Click :function (){
					var cRecord = self.gridStore.getAt(self.rowEditing);
					if (cRecord.get('type') != 'DB_Enum')
						return;
					var prop = self.properties[cRecord.get('id')].getValue();
					var _enum = enums.getEnumById(self.enumInstance, prop._enum);

					var enumsFields = Object.keys(_enum.fields).filter(function (v){
						return _enum.fields[v].type == 'DB_Enum';
					}).map(function (v){
						return _enum.fields[v];
					});
					filterStore.removeAll();
					self.gridStore.each(function (record){
						if (record.get('type') != 'DB_Enum')
							return;
						var p = self.properties[record.get('id')].getValue();
						var f = enumsFields.find(function (v){
							return v.properties._enum == p._enum;
						});
						if (f) {
							var r = new filterStore.recordType({
								'filterId' :record.get('id'),
								'filterValue' :record.get('name')
							});
							filterStore.add(r);
						}
					});
					fields.triggerComboBox.prototype.onTrigger2Click.apply(this, arguments);
				},
				onTrigger1Click :function (){
					this.clearValue()
				},


				clearValue :function (){
					if (comboFilter.filterValueObj)
						comboFilter.filterValueObj = undefined;
					Ext.form.ComboBox.prototype.clearValue.apply(this, arguments);
				}
			});
			comboFilter.on('beforeselect', function (c){
				c.filterValueObj = undefined;
			});
			var cm = new Ext.grid.ColumnModel([
				{
					id :"name",
					header :"Nombre",
					dataIndex :"name",
					editor :headerEditor
				},
				{
					header :"Tipo",
					dataIndex :"type",
					editor :dataTypeSelector,
					renderer :function (text){
						for (var j = 0; j < dataArray.length; j++){
							if (dataArray[j][1] == text)
								return dataArray[j][0];
						}
						return "";
					}
				},
				{
					header :"Obligatorio",
					dataIndex :"needed",
					editor :new fields.Checkbox({
						tooltip:'Requerido'
					}),
					listeners:{
						check:function(t, value){
							if(self.enumHasData){}
						}
					},
					renderer : boolRender
				},
				{
					header :"Filtro",
					dataIndex :"fieldToFilter",
					editor :comboFilter,
					renderer :function (o){
						if (!o)
							return '';
						var record = self.gridStore.getAt(self.gridStore.find('id', new RegExp('^' + o + '$')));
						return record.get('name');
					}
				},
				{
					header:'MultiSelecci&oacute;n',
					dataIndex:'multiple',
					editor:this.multiple,
					renderer:boolRender
				}
			]);

			var edittingGrid = false;
			var removeButton = new buttons.btnDelete({
				disabled :this.creating,
				text :"Eliminar",
				tooltip:'Eliminar campo',
				handler :function (){
					var selected = self.gridEditor.getSelectionModel().getSelections();
					//si hay uno solo que no se puede borrar, no se modifica el nomenclador.
					var formulaFields = self.getFormulaFields();
					var getType = nom.Type.Utils.getType;
					if (!self.creating) {
						var error = false;
						selected.map(function (record){
							//no se puede borrar una columna que es referenciada por alguien
							var references = self.refs.getReferences(self.enumInstance, self._enum.id, record.get("id"));
							if (references) {
								self.alertRefsError(record.get('name'), references);
								error = true;
								return false;
							}
							if (!getType(record.get('type').dependsOnOthersFields)) {
								formulaFields._each_(function (value, key){
									if (getType(value.type).dependsOn(record.get('id'), self.properties[key].getValue())) {
										error = true;
										errorMsg('No se puede eliminar la columna:"' + record.get('name') + '" pu&eacute;s la ' +
											'columna:"' + value.header + '" es de tipo f&oacute;rmula y depende de ella.');
										return null;
									}
								})
							}
						});
						if (error)
							return;
					}
					self.gridEditor.stopEditing();
					selected.map(function (record){
						if (record.isDefault) {
							errorMsg("No se puede eliminar el campo: '" + record.get('name') + "'.", "No se puede eliminar" +
								" porque es el tipo por defecto que todo "+self.entityType+" debe tener.");
						}
						else
							self.gridStore.remove(record);
					});
					var count = self.gridStore.getCount();
					removeButton.setDisabled(self.countAddedFields()==0);
					self.gridEditor.fireEvent('dataadded');
				}
			});
			var addButton = new buttons.btnAdicionar({
				text :'Adicionar',
				tooltip:'Adicionar campo',

				handler :function (){
					var recordT = self.gridStore.recordType;
					var p = new recordT({
						name :"",
						type :self.typeStore.getAt(0).get(dataTypeSelector.valueField),
						needed :false,
						id :self.idToString((self.idCount++)),
						multiple:false
					});
					self.gridStore.add(p);
					rowEditor.startEditing(self.gridStore.getCount() - 1, 1, true);
					this.disable();
					removeButton.disable();
					self.gridEditor.fireEvent('dataadded');
				}
			});
			this.removeButton = removeButton;

			var rowEditor = new Ext.ux.grid.RowEditor({
				clicksToEdit :2,
				ignoreFieldChanges :true,
				listeners :{
					'cancelbuttonclicked' :function (){
						edittingGrid = false;
						addButton.enable();
						removeButton.enable();
						var record = self.gridStore.getAt(self.rowEditing);
						if (record) {
							var type = nom.Type.Utils.getType(record.get('type'));
							if (type.getPropertiesExtComp != null && current_PropValue) {
								var propW = type.getPropertiesExtComp(self.enumInstance, self.getEnumId(), record.get('id'), self.getFields(record.get('id')));
								propW.setValue(self.enumInstance,current_PropValue, record.get('id'), self.getEnumId());
								self.properties[record.get('id')] = propW;
							}
						}
						self.gridEditor.fireEvent('dataadded');
						if (self.gridStore.getCount() == 0)
							removeButton.enable();
					},
					"beforeedit" :function (t, rowIndex){
						self.rowEditing = rowIndex;
						dataTypeSelector.getStore().loadData(self.getDataTypeArray(), false);
						var record = self.gridStore.getAt(rowIndex);
						var t = record.get('type');

						showFilter(t);
						showMultiple(t);

						headerEditor.setDisabled(record.isDefault && !record.isDenom);
						dataTypeSelector.setDisabled(record.isDefault && !record.isDenom);

						dataTypeSelector.editingRecord = record;

						current_PropValue = undefined;
						if (self.properties[record.get('id')])
							current_PropValue = self.properties[record.get('id')].getValue();
						//                        if(self.gridStore.getAt(rowIndex).modDisabled){
						//                            return false;
						//                        }
						if (edittingGrid)
							return false;
						comboFilter.filterValueObj = undefined;
						edittingGrid = true;
						addButton.disable();
						removeButton.disable();
						self.gridEditor.fireEvent('dataadded');
						self.showPropertiesButton(t,dataTypeSelector);
						return true
					},
					"afteredit" :function (){
						dataTypeSelector.editingRecord = null;
						edittingGrid = false;
						addButton.enable();
						removeButton.enable();
						self.gridEditor.fireEvent('dataadded');
						if (self.properties[id]) {
							var record = self.gridStore.getAt(self.rowEditing);
							var editedRow = self.rowEditing;
							var id = record.get('id');
							var name = record.get('name');
							var type = record.get('type');
							var typeInst = nom.Type.Utils.getType(type);
							var props = self.properties[id].getValue();
							//                            if (typeInst.propNeedValidationOnServer()) {
							//                                Ext.Ajax.request({
							//                                    url :Genesig.ajax.getLightURL("Nomenclador.default") + "&action=validateProp&type=" + type,
							//                                    params :{
							//                                        props :Ext.encode(props)
							//                                    },
							//                                    success :function (r, o){
							//                                        var resp   = Ext.decode(r.responseText);
							//                                        var record = self.gridStore.getAt(editedRow);
							//                                        if (record === undefined
							//                                            || record.get('type') != type
							//                                            || typeInst.compareProperties(props, self.properties[id].getValue)
							//                                        )
							//                                            return;
							//                                        if ('ERROR' in resp) {
							//                                            errorMsg("Ha ocurrido un error verificando la propiedad", resp.ERROR);
							//                                            return;
							//                                        }
							//                                        self.properties[id].__validatedProp__ = true;
							//                                    },
							//                                    scope :this
							//                                })
							//                            }
						}

						var record = self.gridStore.getAt(self.rowEditing);
						var t = record.get('type');
						var typeInst = nom.Type.Utils.getType(t);
						record.set('integrationProperty',typeInst['integrationProperty']);
					},
					'validateedit' :function (rowEditor, changes, r, rowIndex){
						if (!self.creating && r.modDisabled) {
							if ('type' in changes)
								return false;
						}
						return true;
					}
				}
			});
			this.gridEditor = new Ext.grid.GridPanel({
				title :"Campos de(l)(la) "+this.entityType,
				region :'center',
				cm :cm,
				store :this.gridStore,
				split :true,
				viewConfig :{
					forceFit :true
				},
				clicksToEdit :1,
				selModel :new Ext.grid.RowSelectionModel(),
				plugins :[rowEditor],
				getXType:function(){
					return 'EnumGridEditor'
				},
				getFormVEvtNames:function(){
					return ['dataadded','orderchanged'];
				},
				isValid:function(){
					return this.store.getCount() > 0;
				},
				getValue:function(){
					return '';
				},
				isDirty:function(){
					return true;
				},
				tbar :[
					addButton,
					removeButton,
					{
						handler :function (){
							if (self.countAddedFields() > 0) {
								errorMsg('No puede haber campos a&ntilde;adidos si se queiere copiar un '+self.entityType);
								return;
							}
							self.showEnums(
								function (node){
									self.addFields(enums.getEnumById(self.enumInstance,node.id).fields._queryBy_(function(field){
										return !field.isDefault;
									},this,true));
								}
							)
						},
						tooltip :'Copiar campos de(l) '+this.entityType,
						text:'Copiar',
						iconCls :'gis_copiar'
					},
					'->',
					{xtype :'tbseparator'},
					{
						iconCls :'gis_arriba',
						handler :function (){
							var sm = self.gridEditor.getSelectionModel();
							if (sm.hasSelection()) {
								var r = sm.getSelected();
								var pos = self.gridStore.indexOf(r);
								if (pos == 0)
									return;
								self.gridStore.remove(r);
								self.gridStore.insert(pos - 1, r);
								sm.selectRecords([r]);
								self.gridEditor.fireEvent('orderchanged');
							}
						},
						tooltip :'Subir campo'
					},
					{
						iconCls :'gis_abajo',
						handler :function (){
							var sm = self.gridEditor.getSelectionModel();
							if (sm.hasSelection()) {
								var r = sm.getSelected();
								var pos = self.gridStore.indexOf(r);
								if (pos == self.gridStore.getCount() - 1)
									return;
								self.gridStore.remove(r);
								self.gridStore.insert(pos + 1, r);
								sm.selectRecords([r]);
                                self.gridEditor.fireEvent('orderchanged');
							}
						},
						tooltip :'Bajar campo'
					}
				]
			});
			return this.gridEditor;
		},
		getEnumId :function (){
			var _enumId;
			if(this.fieldsMode)
				return 'fieldsMode';
			if (this.creating) {
				if(!this._enumId_)
					this._enumId_ = (this.nameTextField.getValue().replace(/([^a-z A-Z0-9_])*/g, '') + '-' + Math.ceil(Math.random() * 1000000));
				_enumId = this._enumId_;
			}
			else _enumId = this._enum.id;
			return _enumId;
		},
		showEnums :function (callBack){
			nom.showEnumTree(this.enumInstance,true, callBack);
		},
		createValidator :function (){

			var fields = [
				this.gridEditor
			];
			if(!this.fieldsMode)
				fields.push.apply(fields,[
					this.nameTextField,
					this.descriptionTextArea,
					this.dataSourceSelector
				]);
			(this.extraProps || {})._each_(function (v,k) {
				fields.push(v);
			});
			this.formValidator = new Genesig.Componentes.FormValidator({
				fields :fields,
				buttons :[
					this.buttonSave
				],
				checkDirty:false
			});
			this.formValidator.registrarNuevoXtype({'dataSource' :{evt :['valuesetted']}});
		},
		SaveAndExit :function (){
			if (!this.valid())
				return;
			this.fireEvent("finishedCreation", this.getNomenclador());
			this[this.closeAction]();
		},
		destroy:function(){
			this.destroyProperties();
			nom.nomencladorCreator.superclass.destroy.call(this);
		},
		destroyProperties :function (){
			this.properties._each_(function (pVal){
				if (pVal && pVal.rendered)
					pVal.destroy();
			})
		},
		getNomenclador :function (){
			var nomenclador = {};
			var changes = {add :{}, mod :{}, del :{}, delRefs :[]};
			this.refs.clearToAdd(this.enumInstance);
			var fields = {};
			var self = this;
			nomenclador.name = this.nameTextField.getValue();
			nomenclador.id = self.getEnumId();

			nomenclador.description = this.descriptionTextArea.getValue();
			nomenclador.fields = fields;
			nomenclador.dataSource = this.isDefaultDS() ? this.defaultDataSource : this.dataSourceSelector.getValue();

			var order = 0;
			this.gridEditor.getStore().each(function (record){

				var id = record.get("id"),
					type = record.get("type"),
					needed = record.get("needed"),
					properties = self.properties[id],
					filter = record.get('fieldToFilter'),
					integrationProp = record.get('integrationProperty'),
					header = record.get("name"),
					multi = record.get("multiple"),
					t = nom.Type.Utils.getType(type);

				if (properties)
					properties = properties.getValue();
				if (Ext.isObject(properties))
					properties['filter'] = filter;

				if(t.canBeMultiple)
					properties = (properties || {})._apply_({multiSelection:multi});

				fields[id] = {
					"type" :type, "needed" :needed, "id" :id,
					"properties" :properties, "header" :header,
					'_enumId' :self.getEnumId(),
					'isDefault' :record.isDefault,
					'isDenom' :record.isDenom,
					'integrationProperty':integrationProp,
					'order':order
				};
				order++;
				//anhadir todas las nuevas referencias.
				if (nom.Type.Utils.getType(type).valueType == nom.Type.REF_Type) {
					if (!self.refs.exists(self.enumInstance,nomenclador.id, id, properties._enum, properties.field))
						self.refs.add(self.enumInstance, nomenclador.id, id, properties._enum, properties.field);
				}
			});
			//adicionando las propiedades extras de la entidad.
			nomenclador.tpl= this.tpl;
			if(this.extraProps) {
				nomenclador.extraProps = {};
				this.extraProps._each_(function (v) {
					nomenclador.extraProps[v.propId] = v.getValue();
				});
			}

			fields[nom.Type.PrimaryKey.UNIQUE_ID] = {
				"type" :nom.Type.PrimaryKey.type,
				"id" :nom.Type.PrimaryKey.UNIQUE_ID
			};

			if (this.creating)
				return {_enum :nomenclador, refs :self.refs.getAddedReferences(this.enumInstance)};


			//Ver los cambios y ponerlos en un objeto
			var _enum = this._enum;
			var getType = nom.Type.Utils.getType;
			for (var key in nomenclador.fields){
				if (key == nom.Type.PrimaryKey.UNIQUE_ID)
					continue;
				//add
				if (!(key in this._enum.fields))
					changes.add[key] = nomenclador.fields[key];
				else {
					// ver las modificaciones a los campos
					// lo que importa es el cambio del tipo de campo y las propiedades del tipo.
					var field = nomenclador.fields[key];
					var field2 = _enum.fields[key];
					var fieldType = getType(field.type);
					var field2Type = getType(field2.type);
					var areEquals = fieldType.compareProperties(field.properties, field2.properties);
					//mod
					if (field.type != field2.type || !areEquals)
						changes.mod[key] = nomenclador.fields[key];
					//si el tipo viejo no tiene propiedades, no hay referencia que borrar
					if (field2Type.getPropertiesExtComp == null)
						continue;
					if (field2Type.valueType == nom.Type.REF_Type && !areEquals)
						changes.delRefs.push({
							fromEnum :_enum.id,
							fromField :key,
							toEnum :field2.properties._enum,
							toField :field2.properties.field
						});
				}
			}
			for (key in _enum.fields)
				//del
				if (!(key in nomenclador.fields)) {
					changes.del[key] = key;
					var f = _enum.fields[key];
					var type = getType(f.type);
					if (type.valueType == nom.Type.REF_Type) {
						var properties = f.properties;
						changes.delRefs.push({
							fromEnum :_enum.id,
							fromField :key,
							toEnum :properties._enum,
							toField :properties.field
						})
					}
				}
			changes.addRefs = self.refs.getAddedReferences(this.enumInstance);
			changes['_enum'] = nomenclador;
			return changes
		},
		setEnum:function(){
			this.fillComponents(this._enum);
			if(this.isDefaultDS())
				this.dataSourceSelector.disable();
			this.updateFieldCounter();
		},
		isDefaultDS:function(){
		   return utils.isString(this.defaultDataSource);
		},
		getFields :function (exclude){
			var fields = {};
			var self = this;
			this.gridEditor.getStore().each(function (record){
				var id = record.get("id");
				if (id == exclude)
					return true;
				var type = record.get("type");
				var header = record.get("name");
				fields[id] = {
					'id' :id,
					'type' :type,
					'header' :header,
					properties :self.properties[id] ? self.properties[id].getValue() : undefined
				};
			});
			return fields;
		},
		getFormulaFields :function (){
			var getType = nom.Type.Utils.getType;
			return this.getFields()._queryBy_(function (value, key){
				return getType(value.type).dependsOnOthersFields;
			}, this, true)
		},
		valid :function (notShowAlert){
			var getType = nom.Type.Utils.getType;
            var b = true;
            var self = this;


			if(!this.fieldsMode){
				if (!this.nameTextField.isValid())
					return false;
				if ( ! this.isDefaultDS() && this.dataSourceSelector.getValue() == '') {
					errorMsg("Debe seleccionar un tipo de fuente de datos.");
					notShowAlert = true;
					b = false;
				}
			}
			var fields = this.getFields();
			this.gridEditor.getStore().each(function (record){
				var type = null;
				var id = record.get('id');
				b &= (record.get("name") !== "");
				b &= ((type = record.get("type")) !== "");
				b &= (record.get("needed") !== "");
				self.gridEditor.getStore().each(function (record2){
					b &= (record2 == record) || (record.get("name") !== record2.get("name"));
					if (!b && !notShowAlert) {
						notShowAlert = true;
						errorMsg("No es valido el(la) "+self.entityType, "Un(a) "+self.entityType+" no puede tener" +
							"2 campos con nombres iguales.");
					}
					return b;
				});
				type = getType(type);
				//                if(type.propNeedValidationOnServer()) {
				//                    if(!self.properties[id].__validatedProp__){
				//                        b = false;
				//                        errorMsg('La propiedad del campo '+record.get('name')+' a&uacute;n no ha sido comprobada.');
				//                    }
				//                }
				//los campos que dependen de otros campos, tienen que validarse puesto que pueden cambiar los otros campos
				if (b && type.dependsOnOthersFields)
					b = type.validate(self.enumInstance, fields, self.properties[id].getValue(), fields._queryBy_(function (value){
						return value.id == id
					}, this, false, 1)._first_());
				return b;
			});
			return b && this.gridStore.getCount() > 0;
		},
		fillComponents :function (_enum){
			this.descriptionTextArea.setValue(_enum.description);
			this.nameTextField.setValue(_enum.name);
			if(!this.isDefaultDS())
				this.dataSourceSelector.setValue(_enum.dataSource);
			this.addFields(_enum.fields, true);
		},
		idToNumber :function (id){
			return id._isNumber_() ? id : id.split('_')[1];
		},
		idToString :function (id){
			return id._isString_() ? id : 'f_' + id;
		},
		countAddedFields :function (){
			var count = 0;
			this.gridStore.each(function (record){
				var id = record.get('id'),
					splited = id.split('_');
				if (splited.length == 2 && splited[0] == 'f' && !isNaN(splited[1]))
					count++;
			});
			return count;
		},
		addFields :function (fields, modifying){
			var rT = this.gridStore.recordType;
			for (var key in fields){
				var field = fields[key];
				var filter = '';
				if (field.properties && utils.isFunction(nom.Type.Utils.getType(field.type).getPropertiesExtComp)) {
					this.properties[key] = nom.Type.Utils.getType(field.type).getPropertiesExtComp(this.enumInstance, field._enumId, field.id, fields);
					if (this.properties[key] != null) {
						this.properties[key].setValue(this.enumInstance,field.properties, field.id, field._enumId);
						filter = field['properties']['filter'];
						this.properties[key].enum_filled = true;
					}
				}
				if (field.id != nom.Type.PrimaryKey.UNIQUE_ID) {
					var r = new rT({
						"name" :field.header,
						"type" :field.type,
						"needed" :field.needed,
						"id" :field.id,
						"fieldToFilter" :filter,
						'integrationProperty':field.integrationProperty,
						'multiple':field.properties !== undefined && field.properties['multiSelection']
					});
					if (modifying && this.enumHasData)
						r.modDisabled = true;
					if (field.isDefault)
						r.isDefault = true;
					if (field.isDenom)
						r.isDenom = true;
					this.gridStore.add(r);
					if (!modifying) {
						this.removeButton.setDisabled(this.countAddedFields() ==0);
						this.gridEditor.fireEvent('dataadded');
					}
				}
			}
		},
		alertRefsError :function (name, references){
			var s = "",
				self = this;
			if (references) {
				references._map_(function (item, key){
					var split = key.split(":");
					var _enum = enums.getEnums(this.enumInstance)[split[0]];
					s += self.entityType+": " + _enum._enum.name + " Campo:" + _enum._enum.fields[split[1]].header + ", \n";
				});
				errorMsg("El campo " + name + " no se puede eliminar", "El campo " + name +
					" esta referenciado por:\n" + s);
			}
		},
		showPropertiesButton:function(fieldType, dataTypeSelector){
			var f = function() {
				dataTypeSelector.triggers[0][nom.Type.Utils.getType(fieldType).getPropertiesExtComp === null ? 'hide' : 'show']();
			};
			if(dataTypeSelector.rendered)
				f();
			else dataTypeSelector.on('afterrender',f);
		}
	});
})();