/**
 * Created by Mano on 10/05/2017.
 */
(function(){
	var nom = AjaxPlugins.Nomenclador,
		comps = AjaxPlugins.Ext3_components,
		errorMsg = comps.Messages.slideMessage.error,
		infoMsg = comps.Messages.slideMessage.info,
		types = nom.Type.Types,
		addType =nom.Type.Utils.addType;

	addType('DB_MapserverLayer',nom.Type.ValueType._createSubClass_({
		nameToShow :'Geometr&iacute;a',
		gridRender :function (text){
			text = this._parent_.apply(this, arguments);
			var res = '';
			if (text !== '' && text) {
				try {
					text = text._isObject_() ? text : Ext.decode(text);
				} catch (exc){}
				if (text && text._isObject_()) {
					res = text.label;
					if ('wkt' in text) {
						res = nom.Type.Types.DB_MapserverLayer.getLabel(res);
						if (text['wkt'] === true) {
							res = res._format_({
								layer_name :text.layerName,
								shape_index :text.id,
								shape_text :text.label,
								shape_wkt :true,
								onclick :"AjaxPlugins.Nomenclador.Type.Types.DB_MapserverLayer.loadAndSelectWKT(this);",
								_class :'nomenclador_asyncLoad'
							});
						}
						else {
							res = res._format_({
								shape_index :text.id,
								shape_text :text.label,
								shape_wkt :text.wkt,
								shape_minx :text.bounds.minx,
								shape_miny :text.bounds.miny,
								shape_maxx :text.bounds.maxx,
								shape_maxy :text.bounds.maxy,
								onclick :"AjaxPlugins.Nomenclador.Type.Types.DB_MapserverLayer.selectGeometry(this);"
							});
						}
					}
					if ('img' in text) {
						res = '<div style="cursor:pointer; width: 100%; height: 100%; position: relative;">' +
							'<div onclick="AjaxPlugins.Nomenclador.Type.Types.DB_MapserverLayer.highLightGeoemtry(' + ("'" + text.img + "'") + ');" style="height: 15px; width: 15px; margin-right: 5px; float:left; background-size:contain; background-repeat:no-repeat; background-image: url(' + text.img + ');"></div>' +
							'' + res + '' +
							'</div>';
					}
				}
			}
			return res;
		},
		getPropertiesExtComp :function (enumInstance,_enumId, fieldId){
			var value = '',
				wdw = new AjaxPlugins.Ext3_components.LayersWindow({
					fieldId :fieldId,
					_enumId :_enumId,
					fieldLabel :'Geometr',
					closeAction :'hide',
					layersConfig :{
						validNodes :{
							capa :true,
							campo :false,
							grupo :false
						},
						loadCampos :false
					},
					callback :function (pL){
						value = pL._text;
					},
					getValue :function (){
						return value;
					},
					setValue :function (enumInstance, v){
						value = v;
					}
				});
			wdw.on('cancelclicked', function (){
				wdw.fireEvent('propertynotsetted');
			}, this);
			return wdw;
		},
		getValueEditExtComp :function (enumInstance,field){
			var fldClass = AjaxPlugins.Ext3_components.fields.triggerFieldEnumSelector;
			return new fldClass(this.getDefaultConfig(field)._apply_({
				url :Genesig.ajax.getLightURL("Nomenclador.default") + "&action=getLayerData&layerName=" + field.properties + '&type=DB_MapserverLayer',
				enumAction:'getLayerData',
				enumParams:{layerName:field.properties,type:'DB_MapserverLayer'},
				listColumns :{
					label :'Denominaci&oacute;n',
					id :false
				},
				displayField :'label',
				valueField :'id',
				doDefaultSetValue :false,
				lazyInit :false,
				getValue :function (){
					var cV = '';
					try {
						cV = Ext.encode(this.getCurrentValue());
					} catch (exc){}
					return cV;
				},
				setValue :function (v){
					if (v && v != '' && !this.doDefaultSetValue) {
						try {
							// v = Ext.decode(v);
							return this.setCurrentValue(v.id);
						} catch (exc){}
					} else if (this.doDefaultSetValue) {
						return fldClass.prototype.setValue.call(this, v);
					}
				},
				reset :function (){
					this.doDefaultSetValue = true;
					this.clear();
					this.doDefaultSetValue = false;
				},
				dataProxy :function (callback, scope, params){
					var self = this;
					nom.request(this.enumAction, this.enumParams,function (data){
						var allNull = true;
						data._map_(function(v){
							allNull = v.label=== null && allNull;
						});
						if(allNull)
							errorMsg('El campo label de la capa se encuentra vac&iacute;o, ver propiedades de la capa.');
						callback.call(scope, self.root ? data[self.root] : data);
                    },function(){callback.call(scope,[])});
				},
				listeners :{
					afterrender :function (){
						var o = {};
						o[this.getXType()] = {evt :['datachanged']}
						this._addModWindow_.registrarXtypes2Validator(o);
					}
				},
				isValid :function (){
					if (field.needed)
						return this.currentValue != null;
					return true;
				}
			}));
		},
		enumTypeRenderer :function (obj){
			if (obj.label == '') {
				return 'Gemetr&iacute;a sin label.';
			}
			return obj.label;
		},
		isLazy :function (){
			return false;
		},
		loadFunc :function (enumInstance,pEl, callback){
			types.DB_MapserverLayer.loadAndSelectWKT(pEl);
		},
		getColumnTypeHeader :function (enumInstance, field){
			return ('<tr><td>Tipo</td><td>{type}</td></tr>' +
			'<t><td>Capa</td><td>{capa}</td></t>')._format_({
				type :this.nameToShow,
				needed :field.needed ? 'si' : 'no',
				capa :field.properties
			});
		}
	})._apply_({
		referenceMap :null,
		highLightGeoemtry :function (pImg){
			var img = '<div class="nomenclador_geometrie_img" style="background-image: url(' + pImg + ')"></div>',
				div = new Ext.Element(document.body.appendChild(document.createElement('div')));
			div.dom.innerHTML = img;
			div.addClass('nomenclador_geometrie_container');
			div.addClass('nomenclador_visible');
			div.first().addClass('nomenclador_visible');
			var closeBtn = div.first().createChild({
				tag :'div',
				cls :'nomenclador_geometrie_container_close'
			});
			closeBtn.on('click', function (){
				div.remove();
			});
			closeBtn.addClass('gisTtfIcon_flaticon-cross-mark-on-a-black-circle-background');
		},
		selectGeometry :function (pEl){
			nom.eachUI(function(ui){
				ui.collapse();
			});
			var wkt = pEl.getAttribute('shape_wkt'),
				high = AjaxPlugins.Nomenclador.highLightedGeometries = Genesig.Utils.locate(wkt);
			high.highLight({}._apply_(Genesig.Utils.highLight.STYLES.DEFAULT)._apply_({
				label :pEl.getAttribute('shape_text')
			}));
		},
		getLabel :function (res){
			return '<label ' +
				"shape_wkt='{shape_wkt}' " +
				"shape_index='{shape_index}' " +
				"shape_text='{shape_text}' " +
				"shape_minx='{shape_minx}' " +
				"shape_miny='{shape_miny}' " +
				"shape_maxx='{shape_maxx}' " +
				"shape_maxy='{shape_maxy}' " +
				"layer_name='{layer_name}' " +
				"feature_id='{feature_id}' " +
				"class={_class} " +
				"style='cursor: pointer; text-decoration: underline; font-weight: bold; font-style: italic; color: #31599A;' " +
				"onclick='{onclick}'" +
				'>' + res + '</label>';
		},
		loadAndSelectWKT :function (pEl, callback, noSelect){
			if (pEl.getAttribute('shape_wkt') !== 'true') {
				AjaxPlugins.Nomenclador.Type.Types.DB_MapserverLayer.selectGeometry(pEl);
				return;
			}
			var mask = Genesig.Utils.mask(new Ext.fly(pEl));
			nom.request('getWkt_DB_MapserverLayer',{
                layerName :pEl.getAttribute('layer_name'),
                featureId :pEl.getAttribute('shape_index'),
                type:'DB_MapserverLayer'
            },function (resp){
				pEl.setAttribute('shape_wkt', resp.wkt);
				pEl.setAttribute('shape_minx', resp.bounds.minx);
				pEl.setAttribute('shape_miny', resp.bounds.miny);
				pEl.setAttribute('shape_maxx', resp.bounds.maxx);
				pEl.setAttribute('shape_maxy', resp.bounds.maxy);
				if (Ext.isFunction(callback))
					callback();
				if (!noSelect)
					AjaxPlugins.Nomenclador.Type.Types.DB_MapserverLayer.selectGeometry(pEl);
            },null,mask);
		},

	}));

})();