/**
 * Created by Mano on 10/05/2017.
 */
(function(){
    var nom = AjaxPlugins.Nomenclador,
        addType =nom.Type.Utils.addType,
        mapUtils = AjaxPlugins.MapUtils,
        deps = AjaxPlugins.Nomenclador.Type.commonDepependencies;

    /**
     * Tipo geometrico.Solo para pintar geometrias y guardarlas.
     * @class AjaxPlugins.Nomenclador.Type.Types.DB_GeomDrawer
     */
    addType('DB_GeomDrawer',Ext.extend(nom.Type.ValueType, {
        nameToShow :"Pintador de Geometr&iacute;a",
        getPropertiesExtComp :function (){
            return new geom_drawer();
        },
        getValueEditExtComp :function (enumInstance, field){
            var trigger =  new AjaxPlugins.Ext3_components.fields.triggerField({
                allowBlank :!field.needed,
                fieldLabel :field.header,
                onTrigger2Click: function(){
                    nom.hideUI(enumInstance.getName(), enumInstance.getInstanceNameModifier());
                    mapUtils.export.VECTOR.getGeomDrawer(
                        deps.getGeomDrawerConfig(trigger, enumInstance, trigger.getValue())
                    ).then(function(geoms){
                        var parser = new OpenLayers.Format.GeoJSON();
                        trigger.setValue(parser.write(geoms[0]));
                    })
                },
                setValue: function (value) {
                    this.currentValue = value;
                    var self = this,
                        f = function(){
                        trigger.setRawValue('geometria seleccionada');
                            self.fireEvent('datachanged');
                    };

                    if(!this.rendered)
                        this.on('afterrender',f);
                    else
                        f();

                },
                getValue: function () {
                    if(this.currentValue)
                        return this.currentValue;
                    return '';
                },
                getFormVEvtNames: function(){
                    return 'datachanged';
                },
                getXType: function(){
                    return 'geomDrawertrigger';
                },
                isDirty: function () {
                    return true;
                }
            });
            return trigger;
        },
        gridRender: function (value) {
            return 'geometria';
        }
    }));

    var geom_drawer = Ext.extend(Ext.Window, {
        width: 400,
        height: 100,
        title: 'Propiedades del Pintador de Geometr&iacute;as',
        layout: 'form',
        defaults:{
            anchor: '90%'
        },
        constructor: function(config){
            Ext.apply(this, config);
            this.initializeUI();

            geom_drawer.superclass.constructor.apply(this,arguments);
        },
        initializeUI: function(){

            this.items = [
                this.geomType =  new AjaxPlugins.Ext3_components.fields.comboBox({
                    mode: 'local',
                    displayField: 'name',
                    valueField: 'id',
                    fieldLabel: 'Tipo de Geometr&iacute;a',
                    labelAlign: 'top',
                    store: new Ext.data.JsonStore({
                        fields:['id','name'],
                        value: 'point',
                        data:[
                            {id: 'point', name: 'Puntual'},
                            {id: 'line', name: 'Lineal'},
                            {id: 'polygon', name: 'Poligonal'}
                        ]
                    })
                })
            ];

            this.buttons = [
                this.aceptBtn = new AjaxPlugins.Ext3_components.buttons.btnAceptar({
                    handler: function(){
                        this.close();
                    },
                    scope: this
                })
            ]
        },
        getValue:function(){
            return this.geomType.getValue();
        },
        setValue: function(value){
            var f = function(){
                self.geomType.setValue(value);
            },
                self = this;
            if(!this.rendered)
                this.on('afterrender',f);
            else f();
        }
    })

})();