/**
 * Created by Mano on 10/05/2017.
 */
(function(){
	var nom = AjaxPlugins.Nomenclador,
		comps = AjaxPlugins.Ext3_components,
		buttons = comps.buttons,
		fields = comps.fields,
		errorMsg = comps.Messages.slideMessage.error,
		types = nom.Type.Types,
		addType =nom.Type.Utils.addType;

	addType('DB_MathFormula',Ext.extend(nom.Type.Formula, {
		constructor :function (){
			types.DB_MathFormula.superclass.constructor.apply(this, arguments);
		},
		nameToShow :'F\u00F3rmula Matem\u00E1tica'._parse2Unicode_(),
		getPropertiesExtComp :function (enumInstance,_enumId, fieldId, fields){
			var fields = this.getValidFields(enumInstance,fields)._map_(function (v){
				return {
					name :v.header,
					idd :v.id,
					dataType :'numero'
				}
			});
			var f = {};
			fields._each_(function (v){
				f[v.name] = v.idd;
			});
			var qb = new comps.QueryBuilder(
				'formulas_matematicas_php',
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
						return '($' + f[p1] + ')';
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
				fieldLabel :field.header
			})
		},
		getValidFields :function (enumInstance, fields){
			return fields._queryBy_(function (value, key){
				if (value.type == 'DB_Number' || value.type == 'DB_MathFormula')
					return true;
				else if (value.type == 'DB_Enum') {
					var _enum = nom.enums.getEnumById(enumInstance, value.properties._enum);
					var type = _enum.fields[value.properties.field].type;
					return type == 'DB_Number' || type == 'DB_MathFormula';
				}
				return false;
			});
		},
		validate :function (enumInstance, fields, propValue, field){
			var f = {};
			this.getValidFields(enumInstance,fields)._each_(function (v){
				f[v.id] = true
			});
			var v = true;
			propValue.dependencies._each_(function (value, key){
				v = !!f[key];
				var toR = v ? true : null;
				if (!toR) {
					errorMsg("El nomenclador no es valido.", "La propiedad del campo: '" + field.header + "' no es v&aacute;lido, el campo: '" + fields[key].header + "' ha cambiado su tipo de valor a uno no num&eacute;rico");
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
			return {'DB_Number' :'N&uacute;mero', 'DB_MathFormula' :'F&oacute;rmula'};
		},
		canBeSelected :function (enumInstance, fields){
			if (this.getValidFields(enumInstance,fields)._length_() > 0)
				return true;
			errorMsg("Para poder seleccionar el tipo F&oacute;rmula Matem&aacutetica, debe haber al menos un campo de tipo " +
				"N&uacute;mero, o de tipo Nomenclador que referencie a una columna de tipo N&uacutemero.");
			return false;
		}
	}));
})();