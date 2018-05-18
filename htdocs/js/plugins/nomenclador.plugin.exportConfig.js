/**
 * Created by john on 28/02/17.
 */


AjaxPlugins.Nomenclador.plugins.exportConfig = {
    owner : null,
    constructor : function(pOwner){
        this.owner = pOwner;

        pOwner.addControl2EnumsTreePanel(
            {
                text:'Exportar nomenclador',
                iconCls:'gis_exportar',
                scope:this,
                handler : this.exportEnum
            },
            function(pAtrs){
                return pAtrs._type_ == 'enum';
            }
        );

        pOwner.addControl2DataSourcesPanel(
            {
                text:'Exportar',
                iconCls:'gis_exportar',
                disabled : true,
                scope:this,
                handler : this.exportDataSource
            },
            function(pAtrs){
                return pAtrs ? true : false;
            }
        );

        pOwner.addControl2DataSourcesPanel(
            {
                text:'Importar',
                iconCls:'gis_importar',
                scope:this,
                handler : this.importDataSource
            }
        );
    },
    exportEnum : function(pEnum){
        //todo
    },
    exportDataSource : function(pDataSource){
        //todo
    },
    importDataSource : function(pDataSource){
        //todo
    }
}._createClass_();