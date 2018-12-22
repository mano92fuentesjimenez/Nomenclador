/**
 * Created by john on 7/03/17.
 */

AjaxPlugins.Nomenclador.plugins.resumeView = {
    owner : null,
    resumeWindow : null,
    constructor : function(pOwner){
        this.owner = pOwner;

        pOwner.addControl2EnumsEditPanel({
            iconCls : 'gisTtfIcon_webdev-seo-table gisFontTheme',
            tooltip: 'Ver resumen de datos',
            handler : this.viewResumeView._delegate_([],this),
            scope: this
        });
    },
    getTpl : function(pCallback,pScope){
        AjaxPlugins.Nomenclador.request('getResumeViewTpl',null,function(pR){
                pCallback.call(pScope,pR);
            },
            function() {
                pCallback.call(pScope, null);
            });
    },
    getData : function(pEnum,pCallback){
        this.resumeWindow.loadingMask = Genesig.Utils.mask(this.resumeWindow);
        AjaxPlugins.Nomenclador.getEnumData(
            pEnum.id,
            '',
            function(){
                this.resumeWindow.loadingMask();
                this.currentData = arguments[0];
                pCallback.apply(this,arguments);
            },
            this,
            true
        );
    },
    viewResumeView : function(enumInstance, pGridElement,pStore,pSelections){
        var enumDetails = pGridElement._enum,
            structure = AjaxPlugins.Nomenclador.getEnumStructure(enumInstance, enumDetails.id,false, function(f){
                return AjaxPlugins.Nomenclador.Type.Utils.getType(f.type).showInReport();
            },this);

        this.showResumeWindow(enumDetails,structure,'');

        this.getData(
            pGridElement._enum,
            this.createEnumResumeView._delegate_([
                enumDetails,
                structure
            ],this)
        );
    },
    createEnumResumeView : function(pEnum,pStructure,pData){
        var self = this,
            structure = pStructure,
            headingsCfg = this.getEnumHeadings(structure),
            headings = headingsCfg.htmlHeadings,
            data = this.getEnumData(headingsCfg.headingsObjects,pData),
            pTemplate = {},
            htmlTable;

        pTemplate.headings = headings.join('');
        pTemplate.data = data.join('');

        this.getTpl(function(pTpl){
            if(pTpl && pTpl !== ''){
                this.showResumeWindow(
                    pEnum,
                    structure,
                    pTpl._format_(pTemplate)
                );
            }else{
                AjaxPlugins.Ext3_components.Messages.slideMessage.error('Ha ocurrido un error cargando la plantilla del resumen.');
            }

        },this);
    },
    getFieldNodeLeafsFields : function(pNd){
        return pNd.queryChilds(function(pN){
            return pN.isLeaf();
        },this,true);
    },
    getFieldNodeColspan : function(pNd){
        return this.getFieldNodeLeafsFields(pNd)._queryBy_(function(pNd){
            return !pNd.get('hiddenEnumField');
        })._length_();
    },
    getEnumHeadings : function(pStructure){
        var self = this,
            resp = [],
            headings = [],
            fields = {},
            root = pStructure.getRoot(),
            maxLevel = pStructure.maxLevel,
            excludes = {},
            wrapper = function(pNd){
                var lvl = pNd.getLevel()-1,
                    leaf = pNd.isLeaf(),
                    tpl = '<th class="{nodePath}" nodeId={nodeId} colspan="{colspan}" rowspan="{rowspan}">{text}</th>',
                    pth = pNd.getPath('fieldId').join('__'), tmp ='',
                    obj = {
                        colspan : 1,
                        nodeId : pNd.getId(),
                        rowspan : 1,
                        text : pNd.getText(),
                        nodePath : ''
                    };

                if(pNd.get('hiddenEnumField')) return false;

                obj.colspan = (leaf ? 1 : self.getFieldNodeColspan(pNd));

                pth.split('__')._each_(function(pS){
                    if(pS != ''){
                        if(tmp == ''){
                            obj.nodePath += ' __'+pS;
                            tmp+='__'+pS;
                        }else{
                            tmp+='__'+pS;
                            obj.nodePath += ' '+tmp;
                        }

                    }
                });

                obj.rowspan = leaf ? maxLevel-lvl : 1;

                if(!leaf && obj.colspan == 1){
                    excludes[wrapper((pNd.getChilds(false).pop()))] = true;
                }

                return tpl._format_(obj);
            };

        root.eachChild(function(pNd){
            var lvl = pNd.getLevel()-1,
                atrs = pNd.attributes,
                obj,
                th;

            headings[lvl] = this._default_(headings[lvl],[]);

            th = wrapper(pNd);

            if(th !== false){
                headings[lvl].push(th);
                fields[pNd.getPath('fieldId').join('__')] = obj = new AjaxPlugins.Nomenclador.Type.Types[atrs.type]();
                obj.gridRender = obj.gridRender._delegate_([],{
                    _fieldDetails_ : atrs,
                    _enumDetails_ : atrs.type == 'DB_Enum' ? AjaxPlugins.Nomenclador.enums.getEnumById(this.enumInstance,atrs.properties._enum) : ''
                });
            }

        },this,true);

        resp = headings._map_(function(pHds){
            return '<tr>'+pHds._queryBy_(function(pHd){
                return !excludes[pHd];
            }).join('')+'</tr>';
        });

        return {
            headingsObjects : fields,
            htmlHeadings : resp
        };
    },
    getEnumColumnHeading : function(pField){
        var res = '<th>'+pField.header+'</th>';

        if(pField.type == 'DB_Enum'){
            res = '<th></th>>'
        }

        return res;
    },
    getEnumData : function(pConfig,pData){
        var trs = [],
            res = [],
            pth, tmp,
            tpl = '<td class="{class}" cellType="dataCell">{html}</td>',
            params,
            getData = function(pParent,pData){
                var pStr = pParent ? pParent+'__' : '__';
                pData._each_(function(pV,pK){
                    pth = pStr+pK;
                    params= {};

                    if(pV._isObject_()){
                        (getData._delegate_([pth,pV]))();
                    }else if(pConfig[pth]){
                        tmp = '';
                        params.html = (pConfig[pth]).gridRender(pV);
                        params.class = '';

                        pth.split('__')._each_(function(pS){
                            if(pS != ''){
                                if(tmp == ''){
                                    params.class += ' __'+pS;
                                    tmp+='__'+pS;
                                }else{
                                    tmp+='__'+pS;
                                    params.class += ' '+tmp;
                                }

                            }
                        });

                        var index = (Object.keys(pConfig).indexOf(pth));

                        if(index !== -1) res[index] = tpl._format_(params);
                    }
                });
            };

        pData._each_(function(pV,pK){
            res = [];
            getData(null,pV);
            trs.push('<tr>'+res.join('')+'</tr>');
        });

        return trs;
    },

    export2Pdf : function(pHTML){
        AjaxPlugins.Nomenclador.request('exportResumeViewTpl2Pd',{resumeViewHTML : pHTML},
            function(resp){
                window.open(resp.document);
            })
    },

    showResumeWindow : function(pEnum,pStructure,pHTML,pData){
        var self = this,
            wdw = this.resumeWindow,
            htmlForm, tree, checkTree;

        if(!wdw){
            htmlForm = new Ext.Panel({
                region:'center',
                html: pHTML
            });

            checkTree = new AjaxPlugins.Ext3_components.plugins.tree.checkedTree;

            tree = new Ext.tree.TreePanel({
                root : {
                    expanded : true,
                    children : pStructure.getRoot().attributes.items
                },
                rootVisible:false,
                plugins : [
                    new AjaxPlugins.Ext3_components.plugins.tree.nodeRenderer({
                        nodesProxy : function(pAtrs){
                            var atrs = this._default_(pAtrs,{})._clone_();
                            atrs.checked = true;
                            atrs.children = atrs.items;
                            if(atrs.type == 'DB_Enum'){
                                atrs.text = atrs.text+' <span style="color: gray">(Nomenclador: '+(AjaxPlugins.Nomenclador.enums.getEnumById(atrs.properties._enum).name)+')</span>';
                            }
                            return atrs;
                        }
                    }),
                    checkTree
                ],
                listeners:{
                    nodeToogleCheck : function(pNd,Status,pSt){
                        if(htmlForm.el && htmlForm.el.dom){
                            var cls = 'nomenclador_hiddenColumns',
                                table = htmlForm.el.dom,
                                nd = pStructure.getNodeById(pNd.attributes.id),
                                selectorCls, els;

                            function setStatus(pNode,pPStatus){
                                pNode.set(
                                    'hiddenEnumField',
                                    (
                                        pPStatus
                                            ?   false
                                            :   true
                                    )
                                );
                            }

                            setStatus(nd,Status);
                            self.getFieldNodeLeafsFields(nd)._each_(function(pN){
                                setStatus(pN,Status);
                            });

                            return;
                        }
                    }
                }
            });

            tree.getSelectionModel().on({
                selectionchange : function(pSel,pNd){
                    var table = htmlForm.el.dom,
                        clsName = 'resumeView_HighLightedEnumField';

                    table.querySelectorAll('.'+clsName)._each_(function(pEl){
                        Ext.fly(pEl).removeClass(clsName);
                    });

                    if(pNd) {
                        var nd = pStructure.getNodeById(pNd.attributes.id),
                            path = nd ? nd.getPath('fieldId').join('__') : null;

                        if (path) {
                            var els = table.querySelectorAll('.' + path);
                            els._each_(function (pEl) {
                                Ext.fly(pEl).addClass(clsName);
                            });
                        }
                    }
                }
            });

            wdw = this.resumeWindow = new Ext.Window({
                height: 300,
                width : 300,
                maximizable : true,
                title:'Datos del nomenclador: '+pEnum.name,
                maximized : true,
                collapsible:true,
                minimizable : true,
                resumeHTMLForm : htmlForm,
                tbar:[
                    {
                        iconCls:'gis_exportpdf',
                        text:'Exportar a pdf',
                        tooltip:'Exportar a pdf',
                        handler : function(){
                            self.export2Pdf(self.resumeWindow.resumeHTMLForm.el.dom.innerHTML);
                        }
                    }
                ],
                layout:'border',
                items:[
                    {
                        title:'Estructura nomenclador',
                        region:'west',
                        width:250,
                        split:true,
                        layout:'fit',
                        collapsible:true,
                        tools:[
                            {
                                id: 'refresh',
                                qtip:'Actualizar vista previa',
                                handler : function () {
                                    self.createEnumResumeView(
                                        pEnum,
                                        pStructure,
                                        self.currentData
                                    );
                                }
                            }
                        ],
                        items:[
                            tree
                        ]
                    },
                    {
                        region:'center',
                        layout:'fit',
                        items:[
                            htmlForm
                        ]
                    }
                ],
                listeners: {
                    scope:this,
                    close : function(){
                        this.resumeWindow = null;
                    }
                }
            });
        }

        if(this.resumeWindow.rendered) this.resumeWindow.resumeHTMLForm.el.dom.innerHTML = pHTML;

        wdw.show();
    }

}._createClass_();
