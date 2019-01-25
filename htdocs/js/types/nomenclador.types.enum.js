/**
 * Created by Mano on 10/05/2017.
 */
(function(){
	var nom = AjaxPlugins.Nomenclador,
		buttons = AjaxPlugins.Ext3_components.buttons,
		comps = AjaxPlugins.Ext3_components,
		errorMsg = comps.Messages.slideMessage.error,
		types = nom.Type.Types,
		addType =nom.Type.Utils.addType;

    /**
	 * Tipo referencia. Su valor es de la forma
	 * ```json
	 * {
	 *    "valueField": "Es un numero, es la referencia a la llave primaria de otro modelo",
	 *    "displayField": "Es el valor del campo al cual este campo hace referencia"
	 * }
	 * ```
	 * @class AjaxPlugins.Nomenclador.Type.Types.DB_Enum
     */
	addType('DB_Enum',Ext.extend(nom.Type.ValueType, {
		nameToShow :'Nomenclador',
		valueType :nom.Type.REF_Type,
		destroyProp: true,
        canBeFiltered:true,
        canBeMultiple:true,
		gridRender :function (text, pD, pRec){
			if(text == null || text == -1)
				return "Dato no referenciado";
			var field = this._fieldDetails_,
				enumD = this._enumDetails_,
				enumProps = AjaxPlugins.Nomenclador.enums.getEnumById(this._enumInstance_.getName(), field.properties._enum),
				refField = enumProps.fields[field.properties.field],
                fieldClass = enumProps.fields[field.properties.field].type,
                typeObj = new nom.Type.Utils.getType(fieldClass),
				enum_data = "enumId='"+enumProps.id+"'" +
							"base_field_id='"+field.id+"'"+
					        "base_enum_id='" +enumD.id+"'"+
							"enum_row='"+text.valueField+"' " +
							"multi_data='"+Ext.encode(text)+"' "+
							"instance_name='"+this._enumInstance_.getName()+"'" +
							"instance_modifier='"+this._enumInstance_.getInstanceNameModifier()+"'" ;


			if(!field.properties.multiSelection) {
				var /*
                     Los renderizadores tienen que saber lidiar con el tipo de valor de DB_Enum, porque por ejemplo
                     los tipos que se evaluan lazy, si un nomenclador apunta a el, el no tiene forma de saber a que
                     fila pertenece ya que se renderiza en otro nomenclador apuntando a donde esta el originalmente.
                     */
                    rend = typeObj.gridRender.call(this, text.displayField, pD, pRec,null,null,null,{_enum:enumProps,field:refField}),
                    html =  '<div class="enums_Db_Enum">' +
							'<div ' +
							enum_data +
							'onclick="AjaxPlugins.Nomenclador.Type.Types.DB_Enum.getEnumRowData(this);" ' +
							'class="gisTtfIcon_flaticon-information-button">' +
							'</div>'+
							'<div>' + rend + '</div>';
                return html;
            }
            else{
            	var rend = 'Ver mas',
            	html = '<div class="enum_view_link" ' +
						 enum_data +
					    'onclick="AjaxPlugins.Nomenclador.Type.Types.DB_Enum.showMultiEnumsRender(this);"' +
						'>' + rend + '</div>';
            	return html

			}
		},
		getValueEditExtComp :function (enumInstance, field, _enum){
			var referencedEnum = AjaxPlugins.Nomenclador.enums.getEnumById(enumInstance.getName(), field.properties._enum),
				referencedField = referencedEnum.fields[field.properties.field],
				config = {
                    _enum:field.properties._enum,
                    enumInstance: enumInstance,
                    _fieldId:referencedField.id,
                    allowBlank:!field.needed,
                    fieldLabel:field.header,
                    multiSelection:field.properties.multiSelection
                };
			if(!config.multiSelection)
				return new nom.enumInput(config);
			return new nom.multiEnumInput(config._apply_({isGrid:true}));

		},
		getPropertiesExtComp :function (enumInstance,_enumId, fieldId, fields){
			var _enumsToExclude ={};
			fields._each_(function (field, key) {
				if(field.type ==='DB_Enum')
					_enumsToExclude[field.properties._enum] = true;
            });
			nom.refs.getEnumsIdReferencingEnum(enumInstance,_enumId)._each_(function(v){
				_enumsToExclude[v] = true;
			});
			return new enumPropertyWind({fieldId :fieldId, _enumId :_enumId, enumInstance:enumInstance, enumsToExclude:_enumsToExclude});
		},
		compareProperties :function (obj1, obj2){
			if (obj1 == undefined || obj2 == undefined)
				return false;
			var r = obj1._enum == obj2._enum
				&& obj1.field == obj2.field
				&& obj1.multiSelection == obj2.multiSelection;
			//            if(!r)
			//                return r;
			//            r = (!!obj1.filter) == (!!obj2.filter) & obj1.filter;
			//            r = r && (obj1.filter.filter == obj2.filter.filter) && (obj1.filter.depends == obj2.filter.depends);
			return r
		},
		enumTypeRenderer :function (value){
			if (value['displayField'] == null) {
				return 'null'
			}
			return value['displayField'];
		},
		isLazy :function (enumInstance, field){
			var _enum = nom.enums.getEnumById(enumInstance.getName(),field.properties._enum);
			var f = _enum.fields[field.properties.field];
			return nom.Type.Utils.getType(f.type).isLazy(f);
		},
		loadFunc :function (enumInstance,pEl, callback, field){
			var _enum = nom.enums.getEnumById(enumInstance.getName(),field.properties._enum);
			var f = _enum.fields[field.properties.field];
			nom.Type.Utils.getType(f.type).loadFunc(enumInstance,pEl, callback, f);
		},
		getColumnTypeHeader :function (enumInstance, field){
			var refEnum = nom.enums.getEnumById(enumInstance.getName(),field.properties._enum);
			var refField = refEnum.fields[field.properties.field];
			var getType = AjaxPlugins.Nomenclador.Type.Utils.getType;
			return ('<tr><td>Tipo</td><td>{type}</td></tr>' +
			'<tr><td>Referencia al Enum:</td><td>{enumRef}</td></tr>' +
			'<tr><td>Referencia al Campo:</td><td>{fieldRef}</td></tr>'+
			'<tr><td>De tipo:</td><td>{refFieldType}</td></tr>')._format_({
				type :this.nameToShow,
				enumRef :refEnum.name,
				fieldRef :refField.header,
				refFieldType:getType(refField.type).nameToShow
			});
		}
		
	})._apply_(
		{
		getEnumRowDataContainer :function (pElement, pEnum){
			var bd = Ext.getBody(),
				box = pElement.getBoundingClientRect(),
				el = bd.createChild({
					tag :'div',
					cls :'enums_Db_Enum_link',
					children :[
						{
							tag :'div',
							cls :'gisTtfIcon_flaticon-cross-mark-on-a-black-circle-background'
						},
						{
							tag :'div',
							children :[
								{
									tag :'table'
								}
							]
						}
					]
				});
			el.applyStyles({
				left :box.right + 'px',
				top :box.bottom + 'px'
			});
			el.first().on({
				click :function (){
					el.removeClass('enums_Db_Enum_linkVisible');
					setTimeout(function (){
						el.remove();
					}, 500);
				}
			});
			return el;
		},
		getEnumRowData :function (pElement){
			var d = this.getEnumDataFromHtmlEl(pElement),
				instance = nom.enums.getInstance(d.instanceName,d.instanceModifier),
				el = this.getEnumRowDataContainer(pElement),
				self = this;

			nom.getEnumData(d.instanceName,d.instanceModifier,d.enumId,function(resp) {
					self.showLinkRecordData(instance, d.enumId, resp[0], el);
				},null,{ idRow:d.enumRow }
			);
		},
		getEnumDataFromHtmlEl: function(element) {
			var d= {
				enumId : element.getAttribute('enumId'),
				enumRow : element.getAttribute('enum_row'),
				instanceName : element.getAttribute('instance_name'),
				instanceModifier : element.getAttribute('instance_modifier'),
				multiData: Ext.decode(element.getAttribute('multi_data'))
			};
			d['baseEnum']= nom.enums.getEnumById(d.instanceName, element.getAttribute('base_enum_id'));
			d['baseField']=d['baseEnum'].fields[(element.getAttribute('base_field_id'))];
			return d;
		},
		showLinkRecordData :function (enumInstance, pEnumId, pData, pEl){
			var referencedEnum = nom.enums.getEnumById(enumInstance.getName(),pEnumId),
				referencedEnumField = referencedEnum.fields,
				data = {},
				tb = pEl.last().first(),
				thead = tb.createChild({
					tag :'thead',
					children :[
						{
							tag :'tr',
							children :[
								{
									tag :'th',
									colspan :'2',
									html :referencedEnum.name
								}
							]
						}
					]
				}),
				tbody = tb.createChild({
					tag :'tbody'
				}),
				bdRect = document.body.getBoundingClientRect(),
				elRect;
			referencedEnumField._each_(function (pFieldProp, pFieldId){
				if (pFieldId !== nom.Type.PrimaryKey.UNIQUE_ID && pFieldId !== nom.Type.Revision.UNIQUE_ID) {
					var hd = pFieldProp.header,
						value = (AjaxPlugins.Nomenclador.Type.Utils.getType(pFieldProp.type).gridRender.call(
							{
								_fieldDetails_ :pFieldProp,
								_enumDetails_ :referencedEnum,
								_enumInstance_:enumInstance
							},
							pData[pFieldId],
							null,
							new Ext.data.Record(pData)
						));
					data[hd] = value;
					tbody.createChild({
						tag :'tr',
						children :[
							{
								tag :'th',
								html :hd
							},
							{
								tag :'td',
								html :value
							}
						]
					});
				}
			});
			pEl.addClass('enums_Db_Enum_linkVisible');
			setTimeout(function (){
				elRect = pEl.dom.getBoundingClientRect();
				if (elRect.right > bdRect.width) {
					pEl.applyStyles({
						left :'',
						right :'10px'
					});
				}
			}, 500);
		},

		showMultiEnumsRender: function(pElement){
			var d = this.getEnumDataFromHtmlEl(pElement),
				m = new multiRenderer({
					records: d.multiData,
					field: d.baseField,
					_enum: d.baseEnum,
					enumInstance: nom.enums.getInstance(d.instanceName, d.instanceModifier)
				});
			m.show();

		}
	}));


	var enumPropertyWind = Ext.extend(Ext.Window, {
		modal :true,
		_enumsData :null,
		enumInstance:null,
		enums :null,
		tree :null,
		_enumId :null,
		fieldId :null,
		selectedNode :null,
		width :300,
		title :'Seleccionar nomenclador',
		height :400,
		closeAction :'hide',
		layout :'fit',
		onLoadedHeaders :null,
		enumsToExclude: null,
		constructor :function (args){
			this.onLoadedHeaders = Genesig.Utils.createOnReadyFunction();
			this.enums = nom.enums;
			this.tree = new nom.nomencladorTree({
				autoScroll :true,
				showFields :true,
				autoLoadTree :false,
				excludeEnum :args.enumsToExclude,
				enumInstance:args['enumInstance'],
				allowReferencing:true,
				excludeNotNeededFields:true,
				listeners :{
					scope :this,
					loadedheaders :function (pTree){
						this.onLoadedHeaders();
					}
				}
			});
			this.tree.getSelectionModel().on('beforeselect', function (s, node){
				return node.attributes._type_ === 'field' || node.attributes._type_ == 'enum';
			});
			this.tree.on("dblclick", function (node){
				if (node.attributes.field || node.attributes._type_ == 'enum')
					this.hide();
			}, this);
			this.items = [this.tree];
			this.acceptButton = new AjaxPlugins.Ext3_components.buttons.btnAceptar({
				handler :function (){
					if (this.tree.getSelectionModel().getSelectedNode() != null)
						this.hide();
				},
				scope :this
			});
			this.buttons = [this.acceptButton];
			enumPropertyWind.superclass.constructor.apply(this, arguments);
			this.on({
				scope :this,
				afterrender :function (){
					var selM = this.tree.getSelectionModel(),
						fM = this.formValidator = new Genesig.Componentes.FormValidator({
							checkDirty :false,
							fields :[selM],
							buttons :[this.acceptButton]
						});
					selM.isValid = function (){
						var sel = this.getSelectedNode();
						return sel.attributes._type_ == 'field' || sel.attributes._type_ == 'enum';
					};
					fM.registrarNuevoXtype(selM.getXType(), {
						evt :['selectionchange']
					});
					Genesig.Utils.applyButtonsKey(this.buttons, this);
				},
				beforehide :function (){
					var selected = this.tree.getSelectionModel().getSelectedNode();
					if (!selected)
						this.fireEvent('propertynotsetted');
					return true;
				}
			});
			this.addEvents({
				treeBuilded :true
			})
		},
		//        isValid:function(){
		//            return this.selectedNode;
		//        },
		getValue :function (){
			if (!this.rendered)
				return this.obj;
			var _enum,
				field,
				sn = this.tree.getSelectionModel().getSelectedNode(),
				type = sn.attributes._type_;
			//el valor que se muestra en el arbol no es el id del nodo
			if (type == 'field') {
				_enum = this.enums.getEnumByName(this.enumInstance.getName(), sn.parentNode.attributes._text_);
				field = sn.attributes.idNode
			}
			else {
				_enum = this.enums.getEnumByName(this.enumInstance.getName(), sn.attributes._text_);
				field = nom.enums.getDenomField(this.enumInstance.getName(),_enum);
			}

			return {field :field, _enum :_enum.id};
		},
		setValue :function (enumInstance, obj, fieldId, _enumId){
			var self = this,
				f = function (resp) {
                    self.obj = obj._clone_();
                    self.tree.includeEnum = resp > 0 ? nom.enums.getEnumById(self.enumInstance.getName(), obj._enum) : null;
                    self.showed = true;
                    self.tree.initValues();
                    self.onLoadedHeaders(function () {
                        var hasData = resp;
                        var indexed = self.tree.indexedTreePlg,
                            nd = indexed.nodeQueryChildsBy(null, function (pN) {
                                var atrs = pN.attributes,
                                    _enum2 = self.enums.getEnumById(self.enumInstance.getName(), obj._enum),
                                    valid = atrs._type_ == 'field' &&
                                        pN.parentNode &&
                                        pN.parentNode.attributes.idNode === _enum2.id &&
                                        /*(!hasData || ( && hasData)) &&*/
                                        atrs.idNode == _enum2.fields[obj.field].id;
                                return valid;
                            }, self, true);
                        if (nd.length > 0) {
                            nd = nd.pop();
                            indexed.nodeLocate(
                                nd,
                                true
                            );
                            self.selectedNode = nd;
                        }
                    }, self);

                };
			if(_enumId)
				nom.request('enumHasData',{
                    instanceName:enumInstance,
					enumId :_enumId
					},f);
			else
				f(0);
		},
		show :function (){
			if (!this.showed)
				this.tree.initValues();
			this.showed = true;
			Ext.Window.prototype.show.apply(this, arguments);
		}
	});
	var multiRenderer = Ext.extend(Ext.Window,{
		enumInstance:null,
		_enum: null,
		field:null,
		records:null,
		layout:'fit',
		modal: true,
		width: 500,
		height: 500,
		constructor: function(config){
			this._apply_(config);
			//la manera mas facil de hacer un deep clone.
			this.field = Ext.decode(Ext.encode(this.field));
			this.initializeUI();
			multiRenderer.superclass.constructor.apply(this,arguments)
		},
		initializeUI: function(){

			var gridPanel = new Ext.grid.GridPanel({
				store: new Ext.data.JsonStore({
					fields:['valueField','displayField'],
					data:this.records
				}),
				viewConfig: {
					forceFit:true
				},
				cm: new Ext.grid.ColumnModel([
					{header:this.field.header, dataIndex:'displayField',renderer: this.renderer.createDelegate(this)}
				])
			});

			this.items=[
				gridPanel
			]
		},
		renderer:function(value, metaData, record) {
			var enumRenderer = nom.Type.Utils.getType('DB_Enum').gridRender,
				enum_record = {
					displayField: value,
					valueField: record.get('valueField')
				},
				scope = {
					_enumDetails_: this._enum,
					_fieldDetails_: this.field,
					_enumInstance_: this.enumInstance
				};
			this.field.properties.multiSelection = false;

			return enumRenderer.call(scope, enum_record, metaData);
		}
	})


})();