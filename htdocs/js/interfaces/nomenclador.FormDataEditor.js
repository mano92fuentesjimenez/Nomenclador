/**
 * Created by Mano on 10/05/2017.
 */

(function() {
    var comps = AjaxPlugins.Ext3_components,
        buttons = comps.buttons,
        utils = Genesig.Utils,
        nom = AjaxPlugins.Nomenclador,
        errorMsg = comps.Messages.slideMessage.error,
        enums = nom.enums,
        addW = AjaxPlugins.Ext3_components.Windows.AddModWindow;

    nom.interfaces.FormDataEditor = Ext.extend(Ext.util.Observable, {
        constructor : function FormDataEditor (enumInstance, _enum, columns,config) {
            $$.assign(this,config);
            nom.interfaces.FormDataEditor.superclass.constructor.call(this);
            this.enumInstance = enumInstance;
            this._enum = _enum;
            this.columns = columns;
        },
        getEnumFields: function () {
            if (this.enumFieldsCache)
                return this.enumFieldsCache;

            var fields = this._enum.fields._queryBy_(function (f) {
                return f.id !== nom.Type.PrimaryKey.UNIQUE_ID
                    && this.columns.indexOf(f.id) !== -1
                    && f.id !== nom.Type.Revision.UNIQUE_ID;
            }, this, true);
            fields._each_(function (pValue) {
                pValue.typeInstance = nom.Type.Utils.getType(pValue.type);
            }, this, true);
            this.enumFieldsCache = fields;
            return fields;
        },
        /**
         * TO OVERRIDE
         * @param callb
         */
        showEditor: function (data, callb) {
        }
    });



})();