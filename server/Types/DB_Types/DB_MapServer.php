<?php
/**
 * Created by PhpStorm.
 * User: Mano
 * Date: 07/06/2017
 * Time: 13:10
 */
class DB_MapserverLayer extends DB_String{
    public static function getValueFromDB($enumInstance, $record, $value, $field, $connType)
    {
        if ($value !== self::getDefaultValue() && $value != "null") {
            $layerName = $field->field_tree['properties'];
            $sC = ServerContext::getInstance();
            $map = $sC->getMapObj();
            $res = '';
            if(is_string($value))
                $value = Utils::json_decode($value);
            if (isset($value->wkt)) {
                return $value;
            }

            $layerObj = $map->getLayerByName($layerName);
            if ($layerObj == false) {
                new EnumException("La capa $layerName no existe en el mapa actual.");
            }
            $oldProj = ms_newprojectionobj($layerObj->getProjection());
            $newProj = ms_newprojectionobj('init=epsg:4326');

            $layerExt = new LayerExtProxy($map, $layerObj);

            //$featData = $layerExt->getLayerFeaturePreview($value->id,500);
            $featData = $layerExt->getLayerFeature($value->id);
            $featData->project($oldProj, $newProj);

            //$feat = $featData['feature'];
            $feat = $featData;
            $featureMetadata = $feat->values;

            $labelFld = $layerObj->labelitem;

            $value->label = array_key_exists($labelFld, $featureMetadata) ? $featureMetadata[$labelFld] : '';
            $value->displayField = $value->label;
            $value->layerName = $layerName;
            $value->wkt = true;
            //$value->img = $featData['image'];
            $value->bounds = array(
                'minx' => $feat->bounds->minx,
                'miny' => $feat->bounds->miny,
                'maxx' => $feat->bounds->maxx,
                'maxy' => $feat->bounds->maxy
            );
            return $value;
        } else {
            return '';
        }
    }

    public static function getWkt_DB_MapserverLayer($params){
        $serverContext = ServerContext::getInstance();
        $map = $serverContext->getMapObj();
        $layerName = $params['layerName'];
        $featureId = $params['featureId'];

        $layerObj = $map->getLayerByName($layerName);
        if($layerObj == false){
            throw new EnumException("La capa $layerName no existe en el mapa actual.");
        }

        $layerExt = new LayerExtProxy($map,$layerObj);

        //$featData = $layerExt->getLayerFeaturePreview($value->id,500);
        $featData = $layerExt->getLayerFeature($featureId);

        $value = array();
        $value['wkt'] = $featData->toWKT();
        $value['bounds'] = $featData->bounds;
        return $value;

    }
    public static function getMapServerShape($value, $field){
        $layerName = $field->getProperties();

        $sC = ServerContext::getInstance();
        $map = $sC->getMapObj();
        $oldProj = ms_newprojectionobj($map->getProjection());
        $newProj =  ms_newprojectionobj('init=epsg:4326');

//        $value = Utils::json_decode($value);
        $layerObj = $map->getLayerByName($layerName);
        if($layerObj == false){
            throw new LayerNotFound('La capa no se encuentra en el mapa actual.', $layerName);
        }

        $layerExt = new LayerExtProxy($map,$layerObj);

        //$featData = $layerExt->getLayerFeaturePreview($value->id,500);
        $featData = $layerExt->getLayerFeature($value->id);
//        $featData->project($oldProj, $newProj);
        return $featData;
    }

    public static function getShape($enumInstance,$value, $fieldId, $enumId){
        $enums = Enums::getInstance($enumInstance);
        $enum = $enums->getEnum($enumId);
        $field = $enum->getField($fieldId);

        return self::getMapServerShape($value,$field);
    }
    public static function getLayerData($pProps){
        $layerName = $pProps['layerName'];

        $sc = ServerContext::getInstance();
        $mapObj = $sc->getMapObj();
        $layerObj = $mapObj->getLayerByName($layerName);

        if($layerObj == false){
            throw new EnumException("La capa '$layerName' no existe en el mapa actual.");
        }
        $layerExt = new LayerExtProxy($mapObj,$layerObj);

        $labelField = $layerObj->labelitem;

        $data = $layerExt->getLayerShapesData();

        $result = array();
        foreach ($data['data'] as $value) {
            $result[] = array(
                'id'=> $value['index'],
                'label' => $value['data'][$labelField]
            );
        }

        return $result;
    }

}