/**
 * Created by Mano on 19 2 2018.
 */
(function(){
    var nom = AjaxPlugins.Nomenclador,
        types = nom.Type.Types,
        fields = AjaxPlugins.Ext3_components.fields,
        addType =nom.Type.Utils.addType;

    addType('DB_EnumChooser',Ext.extend(nom.Type.ValueType, {
            nameToShow :'Selector de Entidad',
            getValueEditExtComp :function (enumInstance, field){
                var t = new fields.triggerField({
                    allowBlank:!field.needed,
                    fieldLabel:field.header,
                    readOnly:true,
                    onTrigger2Click:function(){
                        nom.showEnumTree(enumInstance, true, function(obj) {
                            var _enum = nom.enums.getEnumById(enumInstance, obj.id);
                            t.dirtyValue = false;
                            t.setValue({
                                valueField: obj.id,
                                displayField: _enum.name
                            })
                        })
                    },
                    setValue:function(v){
                        if(Genesig.Utils.isObject(v)) {
                            this.currentValue = v;
                            v = v.displayField;
                        }
                        fields.triggerField.prototype.setValue.call(this, v);
                        this.fireEvent('datachanged');
                    },
                    getValue:function(){
                        return this.currentValue;
                    },
                    getXType:function(){
                        return '_enumselector';
                    },
                    getFormVEvtNames:function(){
                        return 'datachanged';
                    },
                    isDirty:function () {
                        return !this.originalValue ? true:
                            ( this.originalValue.valueField !== this.currentValue.valueField)
                    }
                });
                return t;
            },
            gridRender :function (value){
                if(value)
                    return value.displayField;
                return '';
            }
        })
    );
})();