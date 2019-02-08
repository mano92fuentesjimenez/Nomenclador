/**
 * @namespace AjaxPlugins
 */

/**
 * @namespace AjaxPlugins.Nomenclador
 * @description
 *Plugin para crear y manipular modelos usando una interfaz grafica. Tambien permite manipular los datos pertenecientes a dichos modelos
 *Un modelo esta descrito por un como
 */

    /**
     * @class AjaxPlugins.Nomenclador.Model
     * @property {string}  id    - Identificador del modelo
     * @property {string}  name  - Nombre que el usuario le puso al modelo
     * @property {object} fields  - Campos del modelo. Cada llave es el identificador y cada valor es un [Field]{@link AjaxPlugins.Nomenclador.Field}
     * @property {string}  description - Descripcion del modelo
     * @property {string}  dataSource  - Identificador de la fuente de datos
     * @property {string}  tpl  - Nombre del tpl que este modelo usa
     * @property {string}  denomField  - Identificador del campo que se va a usar como descripcion
     * @property {number}  modelRevision - Revision del modelo, es para llevar un control de versiones en el modelo
     * @property {number}  dataRevision  - Revision de los datos del modelo, es para llevar un control de versiones en los datos del modelo.
     */

    /**
     * @class AjaxPlugins.Nomenclador.Field
     * @property {string} id       - Identificador
     * @property {boolean} needed  - Dice si es obligatorio q este campo tenga valor o no
     * @property {string}  type    - Uno de los nombres de las clases definidas en [Tipos]{@link AjaxPlugins.Nomenclador.Type.Types}
     * @property {object}  properties - Son las propiedades extras del campo que forman parte de la definicion del tipo del campo
     * @property {boolean} properties.multiSelection  - Dice si el campo es de tipo multiple.
     * @property {string}  header  - Nombre que se muestra en la interfaz
     * @property {string}  _enumId - Identificador del nomenclador al que pertenece este campo
     * @property {string} isDefault - Dice si este campo forma parte de los campos que debe tener el modelo conformado con el tpl que se especifico
     * @property {string} isDenom  - Dice si este campo puede ser usado como denominacion
     * @property {number}  order   - Dice el orden que tiene este campo en la interfaz
     * @property {string} primaryKey  - Es el identificador del campo que se va a tomar como llave primaria
     */

    /**
     * @class AjaxPlugins.Nomenclador.Record
     * @description  Es un Record devuelto por nomencladores cuando se le hace un query
     * Si es el resultado de un query a este modelo
     * ```javascript
     * {
     *     id:'id',
     *     name:'name',
     *     denomField:'f_1'
     *     fields:{
     *         f_1:{
     *            id: 'f_1',
     *            type: 'DB_String'
     *         },
     *         f_2:{
     *            id: 'f_2',
     *            type: 'DB_Number'
     *         },
     *         f_3:{
     *            id: 'f_3',
     *            type: 'DB_Bool'
     *         }
     *     }
     *
     * }
     * ```
     * Seria un arreglo de records de esta manera
     * ```javascript
     * [
     *   {f_1:'texto,'f_2:1,f3:false},
     *   {f_1:'texto,'f_2:1,f3:false}
     * ]
     * ```
     *
     */

_define_('nomenclador',['ext3*','layersWindows','QueryBuilder','mapUtils','nomenclador']);

AjaxPlugins.Nomenclador = {
    
    plugins : {},

    UI: {},

    handleResponse: function () {
    },

    init: function () {
        objView.addToMenuAndBar('nomenclador_id', this.nomencladorWindowCaller, this, false);
       // objView.addToMenuAndBar('nomenclador_id', this.showExampleW,this,false);
    },

    nomencladorWindowCaller: function () {
        
        AjaxPlugins.Nomenclador.createKeys();
        
        _require_('nomenclador').then(function(){
           // AjaxPlugins.Nomenclador.showExampleW();
            AjaxPlugins.Nomenclador.showUI();
        });
    },
    createKeys:function(){
        Ext.Ajax.request({
            url: Genesig.ajax.getLightURL("Nomenclador.default") + "&action=createKeys",
            success:function(){},
            failure: AjaxPlugins.Nomenclador.createKeys
        });
    },
    showExampleW:function(){
        var e = AjaxPlugins.Nomenclador.export;
        var enumI = 'system';
        // -------TESTS-------///
        //        var enum_id ;
        //        e.showEnumTree(enumI, function(item){
        //            enum_id = item.id;
        //
        //            e.getEnumDataPanel(enumI,enum_id,{manageEnum:false},function(result){
        //
        //                var addModW = new AjaxPlugins.Ext3_components.Windows.AddModWindow({
        //                    fields :{
        //                        obj :result
        //                    },
        //                    width :500,
        //                    height :500,
        //                    items :[result]
        //
        //                });
        //                addModW.show();
        //
        //            })
        //        });

               // e.getEnumsList(enumI,
               //     function(enums){
               //         var enum_id = enums[0]['id'];
               //         e.enumExist(enumI,enum_id, function(exists){
               //             var fd = exists ;
               //         });
               //         e.getEnumById(enumI,enum_id, function(_enum){
               //             var e =_enum;
               //         });
               //         e.getEnumByName(enumI,enums[0]['name'],function(_enum){
               //             var e=_enum;
               //         });
               //         e.getEnumAllData(enumI,enum_id,{},function(result){
               //             var r = result;
               //         });
               //         e.getEnumColumnData(enumI,enum_id,{},null,function(result){
               //             var r = result;
               //         });
               //
               //     }
               // );
               //
               // e.getEnumTreeStructure(enumI,function(tree){
               //     var f=tree;
               // })

        //------TESTING TRIGGERFIELDS-------------///

        var mun_fieldPais,
            mun_fieldProvincia,
            f = function (){
                var w = new AjaxPlugins.Ext3_components.Windows.AddModWindow({
                    fields :{
                        pais :mun_fieldPais,
                        prov :mun_fieldProvincia
                    },
                    width :500,
                    height :500,
                    callback:function(v){
                        var a = v;
                    },
                    items :[mun_fieldPais, mun_fieldProvincia,
                        new Ext.Button({
                            text:'jj',
                            handler:function (){
                                var g= 3;
                                var munpa = mun_fieldPais;
                                var munprov = mun_fieldProvincia;
                            }
                        })
                    ]
                });
                w.show();
            };

        e.getEnumSelector(enumI,"pais-544408",null, true,null, {valueField: "70", displayField: "jam"},function (r){
            mun_fieldPais = r;
            e.getEnumSelector(enumI,"prov-372594",null, false, r ,{valueField: "17", displayField: "prov jam"}, function (r){
                mun_fieldProvincia = r;
                f();

            });
        });
    }

};


AjaxPlugins.Nomenclador.Actions = {};

AjaxPlugins.initializablePlugins.push(AjaxPlugins.Nomenclador);

AjaxPlugins.Nomenclador.obtenerNomencladorCategorias = function (pIntegr,pallb,params) {
    var ps = params || {},
        enumInstance = 'instance' in ps ? ps.instance : AjaxPlugins.Nomenclador.export.DEFAULT_INSTANCE;

    AjaxPlugins.SrlConfiguration.verifyEnumsConfig().then(function () {
        return _require_('nomenclador').then(function () {
            AjaxPlugins.Nomenclador.export.showEnumTree(enumInstance,function (pSel) {
                pallb({
                    id: pSel.id,
                    text: pSel.node.attributes._text_
                });
            });
        });
    });
};

AjaxPlugins.Nomenclador.obtenerNomencladorArbol = function (pIntegr,pIdCat,pS,ps,params) {
    ps = ps || {};
    var enumInstance = 'instance' in ps ? ps.instance : AjaxPlugins.Nomenclador.export.DEFAULT_INSTANCE;

    AjaxPlugins.SrlConfiguration.verifyEnumsConfig().then(function () {
        _require_('nomenclador').then(function () {
            AjaxPlugins.Nomenclador.export.getEnumSelector(enumInstance,pIdCat,null, true,null,null,{selector_columns:'all'}, function (r){
                r.on('datachanged',function (d) {
                    pS({
                        text: d.displayField,
                        id : d.valueField
                    });
                });
                r.onTrigger2Click();
            });
        });
    });
};