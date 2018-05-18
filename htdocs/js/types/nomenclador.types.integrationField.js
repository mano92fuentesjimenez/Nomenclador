/**
 * Created by Mano on 10/05/2017.
 */
(function(){
	var nom = AjaxPlugins.Nomenclador,
		types = nom.Type.Types,
        comps = AjaxPlugins.Ext3_components,
        fields = comps.fields,
		addType =nom.Type.Utils.addType;

	nom.request('getEnumsDynamicField',null,function (pFields) {
		if(pFields && pFields._isObject_())
		{

			pFields._each_(function (pFieldCfg,pFieldId) {
			    var orgLabel = this._default_(pFieldCfg.label,''),
                    label = orgLabel.toLowerCase()._first2Upper_(),
                    fldId = 'dynamicField_'+pFieldId,
                    config = {
                        integrationProperty :pFieldId,
                        nameToShow :label,
                        getValueEditExtComp :function (enumInstance, field){
                            return new comps.fields.triggerField({
                                fieldLabel:label,
                                currentValue : null,
                                readOnly : true,
                                allowBlank: !field.needed,
                                tooltip:undefined,
                                onTrigger2Click : function(){
                                    if(AjaxPlugins.Integracion){

                                        var fld = this,
                                            props = this._default_(field.properties,{}),
                                            value = this.currentValue,
                                            extraParams =  {};

                                        AjaxPlugins.Integracion.obtenerNomencladorArbol(
                                            pFieldId,
                                            props.id,
                                            function(pResp){
                                                if(pResp !== -1) fld.setValue(pResp);
                                            },
                                            extraParams,
                                            undefined,
                                            fld.currentValue
                                        );
                                    }else{
                                        comps.Messages.error('No se encuentra el plugin: Integracion');
                                    }
                                },
                                onTrigger1Click : function(){
                                    fields.triggerField.prototype.onTrigger1Click.apply(this,arguments);
                                    this.setValue();
                                },
                                getValue : function(){
                                    return this.currentValue;
                                },
                                validateValue : function(){
                                    var v = fields.triggerField.prototype.validateValue.apply(this,arguments);
                                    /*if(v){
                                        v = this.currentValue != null;
                                    }*/
                                    return v;
                                },
                                isDirty : function(){
                                    return this.originalValue !== this.getValue();
                                },
                                getXType : function(){
                                    return 'dynamicFieldSelector';
                                },
                                setValue : function(pVal,pDefaultValue){
                                    var val = '',
                                        fire = true;

                                    if(pVal && pVal._isObject_()){
                                        this.currentValue = pVal;
                                        val = pVal.text;
                                    }else{
                                        if(pVal && pVal._isString_()){
                                            val = pVal;
                                            fire = false;
                                        }else{
                                            this.currentValue = null;
                                        }
                                    }

                                    fields.triggerField.prototype.setValue.call(this,val);

                                    if(fire) this.fireEvent('datachanged');
                                }
                            })
                        },
                        gridRender :function (text){
                            var res = '',
                                tmpId = 'dynamicEnumRenderer_'._id_(),
                                fldCfg = pFieldCfg,
                                tpl = '<div' +
                                    '{? onclick="AjaxPlugins.Nomenclador.fireEvent(\'{id}\');"?}' +
                                    '{? {!displayPreview!}style="cursor:pointer; width: 100%; position: relative; height: 12px;"?}' +
                                    '   >' +
                                    '{?' +
                                    '   {displayPreview}|{!id!}<label class="enums_dynamic_event_link">{label}</label>' +
                                    '?}' +
                                    '</div>',
                                formatParams = {};

                            if(text && text._isObject_()){
                                res = text.text;
                                formatParams.label = text.text;

                                if(text.html && text.html._isString_() && (fldCfg.displayPreview || fldCfg.showDetails)){

                                    if(fldCfg.displayPreview){
                                        formatParams.displayPreview = text.html;
                                    }

                                    if(fldCfg.showDetails){
                                        formatParams.id = tmpId;

                                        nom.on(tmpId,function () {
                                            var wdw = new Ext.Window({
                                                title: 'Detalles',
                                                width:400,
                                                maximizable : true,
                                                height:400,
                                                modal : true,
                                                layout:'fit',
                                                items:[
                                                    {
                                                        html : text.html
                                                    }
                                                ]
                                            });

                                            wdw.show();
                                        });
                                    }

                                    res = tpl._format_(formatParams);
                                }
                            }

                            return res;
                        }
                    };

			    if(pFieldCfg.loadCategories){
                    config.getPropertiesExtComp = function (enumInstance,_enumId, fieldId){
                        var obs = new Ext.util.Observable();

                        obs._apply_({
                            show : function () {
                                if(AjaxPlugins.Integracion){
                                    AjaxPlugins.Integracion.obtenerNomencladorCategorias(
                                        pFieldId,
                                        function(pResp){
                                            if(pResp == -1){
                                                obs.fireEvent('propertynotsetted');
                                            }else{
                                                obs.value = pResp;
                                            }
                                        },
                                        null,
                                        obs.value
                                    );
                                }else{
                                    AjaxPlugins.Ext3_components.Messages.slideMessage.error('No se ha cargado el plugin Integraci&oacute;n');
                                }
                            },
                            close: function () {

                            },
                            hide : function () {

                            },
                            getValue : function () {
                                return obs.value;
                            },
                            setValue : function (pInstance,pProperties) {
                                obs.value = pProperties;
                            }
                        });

                        return obs;
                    };
                }

                addType(fldId,Ext.extend(nom.Type.ValueType, config));
            });
		}
		/*else{
			Logger.error('Ha ocurrido un error cargando los campos dinamicos');
		}*/

    },function () {

    });

	/*addType('DB_Bool',Ext.extend(nom.Type.ValueType, {
			nameToShow :'Boolean',
			getValueEditExtComp :function (enumInstance, field){
				return new AjaxPlugins.Ext3_components.fields.Checkbox({
					fieldLabel :field.header
				})
			},
			gridRender :function (text){
				text = types.DB_Bool.superclass.gridRender.apply(this, arguments);
				return '<div class=' + (text.toString() == "true" ?
						'"active-image"' :
						'"inactive-image"') + '></div>';
			}
		})
	);*/
})();