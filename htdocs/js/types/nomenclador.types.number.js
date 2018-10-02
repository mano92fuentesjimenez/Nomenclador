/**
 * Created by Mano on 10/05/2017.
 */
(function(){
	var nom = AjaxPlugins.Nomenclador,
		addType =nom.Type.Utils.addType;

	addType('DB_Number',Ext.extend(nom.Type.ValueType, {
		nameToShow :'N\u00FAmero',
		propertyNeeded :false,
		getValueEditExtComp :function (enumInstance, field){
			return new AjaxPlugins.Ext3_components.fields.numberField({
				allowBlank :!field.needed,
				fieldLabel :field.header,
			});
		},
		getPropertiesExtComp :function (){
			return new numberPropertyWind()
		},
		compareProperties :function (obj1, obj2){
			if (obj1 == undefined || obj2 == undefined)
				return false;
			return obj1.type == obj2.type && obj1.precision == obj2.precision && obj1.scale == obj2.scale;
		}
	}));

	var myCheckbox = AjaxPlugins.Ext3_components.fields.Checkbox._createSubClass_({
		getValue :function (){
			if (!this.rendered)
				return this.checked;
			return this._parent_.apply(this, arguments);
		}
	});
	var numberPropertyWind = Ext.extend(Ext.Window, {
		frame :true,
		checks :null,
		closeAction :'hide',
		modal :true,
		layout:'fit',
		height:350,
		title :"Propiedades del campo de tipo numero",
		handler :function (check){
			this.checks.map(function (c){
				c.suspendEvents(false);
				c.setValue(c == check);
				c.resumeEvents();
			});
		},
		constructor :function (){
			var self = this;
			this.checks = [];
			this.checks.push(new myCheckbox({
				boxLabel :"Entero Mediano",
				scope :this,
				value :true,
				checked :true
			}));
			this.checks.push(new myCheckbox({
				boxLabel :"Entero Grande",
				scope :this
			}));
			this.checks.push(new myCheckbox({
				boxLabel :"Reales de alta precision",
				scope :this
			}));
			this.checks.push(new myCheckbox({
				boxLabel :"Reales de baja precision",
				scope :this
			}));
			for (var j = 0; j < this.checks.length; j++){
				this.checks[j].on('check', this.handler, this)
			}
			this.extras = [];
			this.extras.push(null);
			this.extras.push(null);
			this.extras.push(new Ext.Panel({
				items :[
					new Ext.Panel({
						layout :"form",
						labelAlign :"top",
						items :[
							new Ext.form.NumberField({
								allowDecimals :false,
								minValue :0,
								maxValue :1000,
								fieldLabel :"Precision",
								value :100
							}),
							new Ext.form.NumberField({
								allowDecimals :false,
								minValue :0,
								maxValue :1000,
								fieldLabel :"Escala",
								value :100
							})
						]
					})
				]
			}));
			this.extras.push(new Ext.Panel({
				layout :'form',
				labelAlign :"top",
				items :[
					new Ext.form.NumberField({
						allowDecimals :false,
						minValue :1,
						maxValue :53,
						fieldLabel :"Precision",
						value :23
					})
				]
			}));
			this.items = [
				{
					layout:'form',
					frame:true,
					items:[
                        {
                            layout :'column',
                            items :[this.checks[0]]
                        },
                        {
                            layout :'column',
                            items :[this.checks[1]]
                        },
                        {
                            layout :'column',
                            padding :"0 10px 0 0",
                            items :[this.checks[2], this.extras[2]]
                        },
                        {
                            layout :'column',
                            padding :"0 10px 0 0",
                            items :[this.checks[3], this.extras[3]]
                        }
					]
				}
			];
			this.buttons = [
				new AjaxPlugins.Ext3_components.buttons.btnAceptar({
					handler :function (){
						this.hide();
					},
					scope :this
				})
			];
			numberPropertyWind.superclass.constructor.apply(this, arguments);
		},
		getValue :function (){
			var ret;
			if (this.checks[0].getValue())
				ret = {type :'integer'};
			else if (this.checks[1].getValue())
				ret = {type :'bigint'};
			else if (this.checks[2].getValue())
				ret = {
					type :'decimal',
					precision :this.extras[2].items.items[0].items.items[0].getValue(),
					scale :this.extras[2].items.items[0].items.items[1].getValue()
				};
			else if (this.checks[3].getValue())
				ret = {
					type :'float',
					precision :this.extras[3].items.items[0].getValue()
				};
			return ret;
		},
		setValue :function (enumInstance, obj){
			this.checks[0].setValue(false);
			if (obj.type == 'integer')
				this.checks[0].setValue(true);
			else if (obj.type == 'bigint')
				this.checks[1].setValue(true);
			else if (obj.type == 'decimal') {
				this.checks[2].setValue(true);
				this.extras[2].items.items[0].items.items[0].setValue(obj.precision);
				this.extras[2].items.items[0].items.items[1].setValue(obj.scale);
			}
			else if (obj.type == 'float') {
				this.checks[3].setValue(true);
				this.extras[3].items.items[0].setValue(obj.precision);
			}
		}
	});
})();