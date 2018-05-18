/**
 * @namespace Nomenclador
 * @type {{UI: {}, handleResponse: AjaxPlugins.Nomenclador.handleResponse, init: AjaxPlugins.Nomenclador.init, nomencladorWindowCaller: AjaxPlugins.Nomenclador.nomencladorWindowCaller}}
 */

_define_('nomenclador',['ext3*','layersWindows','queryBuilder','nomenclador']);

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

AjaxPlugins.Nomenclador.obtenerNomencladorCategorias = function (pIntegr,pallb) {
    var enumInstance = AjaxPlugins.Nomenclador.export.DEFAULT_INSTANCE;

    _require_('nomenclador').then(function () {
        AjaxPlugins.Nomenclador.export.showEnumTree(enumInstance,function (pSel) {
            pallb({
                id: pSel.id,
                text: pSel.node.attributes._text_
            });
        });
    });
};

AjaxPlugins.Nomenclador.obtenerNomencladorArbol = function (pIntegr,pIdCat,pS) {
    var enumInstance = AjaxPlugins.Nomenclador.export.DEFAULT_INSTANCE;

    _require_('nomenclador').then(function () {
        AjaxPlugins.Nomenclador.export.getEnumDataPanel(enumInstance,pIdCat,function (pSel) {
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