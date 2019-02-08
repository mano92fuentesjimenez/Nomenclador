(function (){
    var deps = AjaxPlugins.Nomenclador.Type.commonDepependencies = {};

    deps.getGeomDrawerConfig = function(scope, enumInstance, value){
        return {
            maxGeometries: 1,
            listeners:{
                'close':function(){
                    AjaxPlugins.Nomenclador.showUI(enumInstance.getName(),null,enumInstance.getInstanceNameModifier())
                }
            },
            originalValue: value?[value]: undefined
        };
    };
})();