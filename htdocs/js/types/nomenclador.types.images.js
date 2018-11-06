(function(){
    var nom = AjaxPlugins.Nomenclador,
        buttons = AjaxPlugins.Ext3_components.buttons,
        comps = AjaxPlugins.Ext3_components,
        fields = comps.fields,
        errorMsg = comps.Messages.slideMessage.error,
        types = nom.Type.Types,
        addType =nom.Type.Utils.addType,
        utils = Genesig.Utils,
        manageImagesExport = AjaxPlugins.ManageImages.export;

    addType('DB_Images',Ext.extend(nom.Type.ValueType, {
        nameToShow :'Im\u00E1genes',
        destroyProp: true,
        canBeMultiple:true,
        gridRender :function (text, pD, pRec){
            var s = '';
            if(utils.isArray(text)) {
                text._each_(function (v) {
                    s += v + ", ";
                });
                if(s !== '')
                    s = s.slice(0,-2);
            }
            else if (utils.isString(text))
                s =text;

            return s;
        },
        getValueEditExtComp :function (enumInstance, field, _enum){
            var invokeManageImages = function(cb,values){
                manageImagesExport.ImageSelectorWindow(cb,values,{allowMultiSelection:field.properties.multiSelection});
            },
                input = null;

            if(!field.properties.multiSelection)
                input = new fields.triggerField({
                    fieldLabel:field.header,
                    allowBlank:field.needed,
                    onTrigger2Click:function(){
                        invokeManageImages(function ff(objs){
                            var v = objs[0] ? objs[0].id : undefined;
                            input.setValue(v);
                            input.fireEvent('datachanged');
                        })
                    },
                    getFormVEvtNames:function(){
                        return 'datachanged';
                    },
                    getXType:function(){
                        return 'enumimageviewer';
                    },
                    isDirty:function(){
                        return true;
                    }
                });
            else {
                var dv = new imageViewer([]);
                input = new Ext.Panel({
                    allowBlank: field.needed,
                    items: [dv],
                    isGrid:true,
                    tbar:[
                        new buttons.btnAdicionar({
                            text: '',
                            handler: function () {
                                invokeManageImages(function (objs) {
                                    objs._each_(function (v) {
                                        dv.store.add(new dv.store.recordType({
                                            code: v.id,
                                            url: manageImagesExport.getImageURL(v.id,20,20)
                                        }))
                                    });
                                    input.fireEvent('datachanged');
                                }, input.getValue())
                            }
                        }),
                        new buttons.btnDelete({
                            text:'',
                            handler: dv.removeSelections,
                            scope:dv
                        })
                    ],
                    getValue:function(){
                        var v = [];
                        dv.store.each(function(r){
                            v.push(r.get('code'))
                        });
                        return v;
                    },
                    setValue:function(values){
                        dv.store.removeAll();
                        if(utils.isArray(values))
                            values._each_(function(v){
                                dv.store.add(new dv.store.recordType({
                                    code:v,
                                    url:manageImagesExport.getImageURL(v)
                                }))
                            });
                        if(dv.rendered)
                        dv.refresh();
                    },
                    getFormVEvtNames:function(){
                        return 'datachanged';
                    },
                    getXType:function(){
                        return 'enumimageviewer';
                    },
                    isValid:function(){
                        return this.allowBlank || dv.store.getCount() > 0;
                    },
                    isDirty:function(){
                        return true;
                    },
                    reset:function(){
                        dv.reset();
                    }
                });
            }
            return input;
        },
        enumTypeRenderer :function (value){

        }

    }));

    var imageViewer = Ext.extend(Ext.DataView, {
        emptyText:'Ninguna imagen para mostrar',
        cls:'enumsImagesDataView',
        selectedClass:'_enum_image_selected',
        overClass:'_enum_image_selected',
        itemSelector:'div._enum_image_ct',
        multiSelect:true,
        selections:null,
        constructor:function(data){
            this.store = new Ext.data.JsonStore({
                fields:['url','code'],
                data:[]
            });
            this.tpl = new Ext.XTemplate(
                '<tpl for=".">',
                    '<div class="_enum_image_ct" image_id="{code}">' +
                        '<img src="{url}">',
                    '</div>',
                '</tpl>');

            imageViewer.superclass.constructor.call(this,{});
            var self = this;
            data._each_(function(v){
                self.store.add(new self.store.recordType(v));
            });

            this.on({selectionchange :this.onSChange });
            this.selections = [];
        },
        onSChange:function(dv,nodes){
            var self = this;
            if(nodes)
                nodes._each_(function(v){
                    var el = Ext.fly(v);
                    if(!el.hasClass('enum_image_selected2')) {
                        el.addClass('enum_image_selected2');
                        self.selections.push(v.attributes.image_id.value);
                    }
                    else {
                        el.removeClass('enum_image_selected2');
                        self.selections.splice(self.selections.indexOf(v.attributes.image_i))
                    }
                })

        },
        getSelections:function(){
            return this.selections;
        },
        removeSelections:function(){
            var self = this;
            this.selections._each_(function(v){
                self.store.remove(self.store.getAt(self.store.find('code',v)));
            });
            this.selections = [];
        },
        removeAll:function(){
            var self = this;
            this.store.each(function(v){
                self.store.remove(v);
            })
        },
        reset:function(){
            this.removeAll();
            this.selections = [];
        }
    })
})();