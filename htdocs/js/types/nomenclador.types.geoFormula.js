/**
 * Created by Mano on 10/05/2017.
 */
(function(){
	var nom = AjaxPlugins.Nomenclador,
		buttons = AjaxPlugins.Ext3_components.buttons,
		comps = AjaxPlugins.Ext3_components,
		fields = comps.fields,
		errorMsg = comps.Messages.slideMessage.error,
		types = nom.Type.Types,
		addType =nom.Type.Utils.addType;

	addType('DB_GeoFormula',Ext.extend(nom.Type.Formula, {
		constructor :function (){
			types.DB_GeoFormula.superclass.constructor.apply(this, arguments);
		},
		nameToShow :'F&oacute;rmula Geom&eacute;trica'._parse2Unicode_(),
		gridRender :function (text, pD, pRec){
			var isEnum = this._fieldDetails_.type == 'DB_Enum';
			var row = pRec.get(nom.Type.PrimaryKey.UNIQUE_ID);
			if (isEnum) {
				row = text.valueField;
				text = types.DB_GeoFormula.superclass.gridRender.apply(this, arguments);
			}
			if (text._isString_()) {
				return ("<div _enumId='{_enum_id}'" +
				"        fieldId='{field_id}'" +
				"        row='{row}'  " +
				"        enum_instance='{enum_instance}'  " +
				"        class='nomenclador_asyncLoad'  " +
				" onclick='AjaxPlugins.Nomenclador.Type.Types.DB_GeoFormula.DoRequest(this);'><div id='replace'>Calcular</div></div>")._format_({
					_enum_id :this._enumDetails_.id,
					field_id :this._fieldDetails_.id,
					enum_instance:this._enumInstance_,
					row :row
				});
			}
			switch (text.type){
				case 'wkt':{
					var r = nom.Type.Types.DB_MapserverLayer.getLabel('Ver Geo');
					r = r._format_({
						shape_wkt :text.value,
						shape_text :"Resultado",
						onclick :"AjaxPlugins.Nomenclador.Type.Types.DB_MapserverLayer.loadAndSelectWKT(this);"
					});
					return r;
				}
					break;
				case 'number':{
					return text.value
				}
					break;
			}
		},
		getPropertiesExtComp :function (enumInstance, _enumId, fieldId, fields){
			var fields = this.getValidFields(enumInstance,fields)._map_(function (v){
				return {
					name :v.header,
					idd :v.id,
					dataType :'geo'
				}
			});
			var f = {};
			fields._each_(function (v){
				f[v.name] = v.idd;
			});
			var qb = new comps.QueryBuilder(
				'formulas_geospaciales_mapscript',
				fields,
				[]);
			var aceptBtn = new buttons.btnAceptar({
				handler :function (){
					wdw.hide();
				}
			});
			qb.on('render', function (){
				var fm = new Genesig.Componentes.FormValidator({
					checkDirty :false,
					fields :[qb],
					buttons :[aceptBtn]
				});
			});
			var self = this;
			var wdw = new Ext.GWindow({
				defaults :{
					frame :true,
					layout :'fit'
				},
				items :[
					{items :qb}
				],
				width :500,
				height :500,
				buttons :[aceptBtn],
				layout :'fit',
				closeAction :'hide',
				hideApplyButton :true,
				title :'Crear f&oacute;rmula',
				getValue :function (){
					if (this.enum_VALUE)
						return this.enum_VALUE;
					var value = qb.getValue();

					var dependencies = {};
					var v = value.replace(/<(.*?)>/g, function (match, p1){
						dependencies[f[p1]] = true;
						return f[p1];
					});
					var raw = value.replace(/<(.*?)>/g, function (match, p1){
						dependencies[f[p1]] = true;
						return '<' + f[p1] + '>';
					});
					return {dependencies :dependencies, value :v, raw :raw};
				},
				listeners :{
					'close' :function (){
						this.fireEvent('propertynotsetted');
					},
					'show' :function (){
						wdw.enum_VALUE = undefined;
					}
				}
			});
			wdw.setValue = function (enumInstance, value){
				this.enum_VALUE = value;
			};
			return wdw;
		},
		getValueEditExtComp :function (enumInstance, field){
			return new fields.simpleField({
				readOnly :true,
				fieldLabel :field.header,
				setValue :function (v){
					return fields.simpleField.prototype.setValue.call(this, v.value);
				}
			})
		},
		getValidFields :function (enumInstance, fields){
			return fields._queryBy_(function (value, key){
				if (value.type == 'DB_GeoFormula' || value.type == 'DB_MapserverLayer')
					return true;
				else if (value.type == 'DB_Enum') {
					var _enum = nom.enums.getEnumById(enumInstance, value.properties._enum);
					var type = _enum.fields[value.properties.field].type;
					return type == 'DB_GeoFormula' || type == 'DB_MapserverLayer';
				}
				return false;
			});
		},
		validate :function (enumInstance, fields, propValue, field){
			var f = {};
			this.getValidFields(enumInstance, fields)._each_(function (v){
				f[v.id] = true
			});
			var v = true;
			propValue.dependencies._each_(function (value, key){
				v = !!f[key];
				var toR = v ? true : null;
				if (!toR) {
					errorMsg("El nomenclador no es valido.", "La propiedad del campo " + field.header + " no es v&aacute;lido, el campo: " + fields[key].header + " ha cambiado su tipo de valor a uno no geom&eacute;trico");
					return toR;
				}
			});
			//            propValue.match(/\(\$[^\(]*?\)/g)._each_(function(val){
			//                v = f[val.slice(2,-1)];
			//                return v? true:null;
			//            });
			return !!v;
		},
		dependsOn :function (field, prop){
			if (field._isObject_())
				field = field.id;
			return prop.dependencies[field]
		},
		getCandidatesTypes :function (){
			return {'DB_Number' :'N&uacute;mero', 'DB_MathFormula' :'F&oacute;rmula Matemática','DB_MapserverLayer':'Geometría'};
		},
		canBeSelected :function (enumInstance,fields){
			if (this.getValidFields(enumInstance, fields)._length_() > 0)
				return true;
			errorMsg("Para poder seleccionar el tipo F&oacute;rmula Geom&eacute;trica, debe haber al menos un campo de tipo " +
				"Geom&eacute;trico, o de tipo Nomenclador que referencie a una columna de tipo Geom&eacute;trico.");
			return false;
		},
		enumTypeRenderer :function (value){
			return 'F&oacute;rmula Geom&eacute;trica';
		},
		propNeedValidationOnServer :function (){
			return true;
		},
		compareProperties :function (obj1, obj2){
			if (obj1 == undefined || obj2 == undefined)
				return false;
			return obj1.value == obj2.value;
		},
		isLazy :function (){
			return true;
		},
		loadFunc :function (enumInstance,pEl, callback){
			types.DB_GeoFormula.DoRequest(pEl, callback);
		},
		showInReport :function (){
			return false;
		}
	})._apply_({
		DoRequest :function (pEl, callback){
			var parentCall = pEl.parentElement.getAttribute('applyOnClick');
			if (pEl.getAttribute('done') == 'true') {
				if (parentCall)
					pEl.parentElement.setAttribute('finished', true);
				return;
			}
			var pp = Ext.fly(pEl);
			var mask = Genesig.Utils.mask(pp);

			nom.request('getWktOnDemand',{
                _enumId :pEl.getAttribute('_enumId'),
                fieldId :pEl.getAttribute('fieldId'),
                enumInstance :pEl.getAttribute('enum_instance'),
                row :pEl.getAttribute('row'),
				type:'DB_GeoFormula'
                },
			    function (resp) {
                    pEl.setAttribute('done', true);
                    var div = "";
                    switch (resp.type) {
                        case 'wkt': {
                            if (resp.value === "GEOMETRYCOLLECTION EMPTY")
                                div = '<label>Vac&iacutea</label>';
                            else {
                                div = nom.Type.Types.DB_MapserverLayer.getLabel('Ver Geometria');
                                div = div._format_({
                                    shape_wkt: resp.value,
                                    shape_text: "Resultado",
                                    onclick: 'AjaxPlugins.Nomenclador.Type.Types.DB_MapserverLayer.selectGeometry(this);'
                                });
                            }
                        }
                            break;
                        case 'number': {
                            div = '<div>' + resp.value + '</div>';
                        }
                            break;
                    }
                    pEl.innerHTML = div;
                    if (parentCall) {
                        pEl.parentElement.setAttribute('finished', true);
                        pEl.parentElement.click();
                    }

                    nom.execute(callback);
                },null,mask);

	}}));
})();