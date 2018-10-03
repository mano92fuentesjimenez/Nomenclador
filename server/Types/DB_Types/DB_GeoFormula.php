<?php
/**
 * Created by PhpStorm.
 * User: Mano
 * Date: 07/06/2017
 * Time: 13:11
 */

class DB_GeoFormula extends Formula{


    public static function getValueFromDB($enumInstance, $record, $value, $field, $connType)
    {
//        return self::evalFormula($record,$value,$field,$connType);
        if($value){
            return $value;
        }

        return 'F&oacute;rmula Geom&eacute;trica';
    }
    public static function savedInBD()
    {
        return false;
    }
    public static function validateDependencies($enumInstance, $enum, $field){

        $enums = Enums::getInstance($enumInstance);
        $prop = $field->getProperties();

        foreach ($prop['dependencies'] as $key => $v) {
            $field = $enum->getField($key);
            $t = $field->getType();
            if ($t == 'DB_MapserverLayer' || $t == 'DB_GeoFormula') {
                continue;
            }
            else if ($t == 'DB_Enum') {
                $property = $field->getProperties();
                $nextEnum = $enums->getEnum($property['_enum']);
                $nextField = $nextEnum->getField($property['field']);
                $type = $nextField->getType();

                if($type =='DB_MapserverLayer' || $type =='DB_GeoFormula')
                    continue;
                throw new EnumException('Mientras usted creaba el nomenclador, las dependencias del tipo f&oacute;'
                    .'mula han cambiado en el servidor. Por favor recargue los nomencladores.');
            }
        }
        return true;
    }

    public static function dependsOn($enum, $field, $onField)
    {
        $prop = $field->getProperties();

        foreach ($prop['dependencies'] as $key => $value) {
            if($key == $onField->getId())
                return true;
        }
        return false;

    }


    public static function canChangeTo($enum,$field,$fromType, $toType)
    {
        return $toType == 'DB_MapserverLayer' || $toType == 'DB_GeoFormula';
    }

    public static function getAcceptedTypes($enum,$field)
    {
        return 'geometr&iacute;a, F&oacute;rmula geom&eacute;trica y Nomenclador que apunte a una geometr&iacute;a, o F&oacute;rmula geom&eacute;trica;';
    }

    public static function lazyInit($enum,$field)
    {
        return true;
    }

    public static function evalFormula($enumInstance, $enum,$field, $record, $value, $connType)
    {
        //todo: como este es un tipo experimental, no tiene especificado ningun requisito
        //por tanto no se le ha dedicado tiempo => que siempre trate de coger la geometria
        //de la coneccion por defecto que deberia ser datossig
        try {
            extract($record);
            $ds = DataSources::getInstance($enumInstance);
            $ds = $ds->getSource(DataSources::DEFAULTNAME);
            include_once '../DBConections/Postgree_9_1.php';
            $conn = new Postgree_9_1($ds->dataSource);

            $str = $field->getProperties();
            $str = $str['value'];
            $geo = new geoFormula();

            $str = 'return $geo->' . $str . '->getValue();';
            $str = eval($str);
            $str = 'select ' . $str . ' as r ';

            $str .= self::buildFrom($enumInstance, $record, $field, $field->getEnumId());

            file_put_contents('/var/www/geo', $str);
            $conn->query($str);
            $data = $conn->fetchData();
            $data = reset($data);

            $r = array();
            $r['type'] = $geo->type;
            $r['value'] = $data['r'];
            if ($r['type'] == 'number') {
                $r['value'] = round($r['value'], 2);
            }

            return $r;
        }
        catch (LayerNotFound $e){
            throw new EnumException( "La capa {$e->layerName} no existe en el mapa actual.");
        }

    }
    public static function getWktOnDemand($params){

        $row = $params['row'];
        $enumId = $params['_enumId'];
        $fieldId = $params['fieldId'];

        $enums = Enums::getInstance($params['enumInstance']);
        $enum = $enums->getEnum($enumId);
        $field = $enum->getField($fieldId);

        if($field->getType() == 'DB_Enum'){
            $props = $field->getProperties();
            $enum = $enums->getEnum($props['_enum']);
            $fieldId = $props['field'];
        }

        $data = $enum->queryEnum(null, null, null, $row, $fieldId, null, null, $fieldId);
        $data = reset($data);
        return $data[$fieldId];
    }
    public static function buildFrom($enumInstance,$record, $field, $enumId){
        $str = 'FROM( select ';
        $props = $field->getProperties();
        foreach ($props['dependencies'] as $key => $value){
            $str .= self::getShape($enumInstance,$record[$key],$key,$enumId)." as $key,";
        }
        $str = substr($str,0,-1);
        $str .=') as subc';
        return $str;
    }
    public static function getShape($enumInstance, $value, $fieldId, $enumId){

        $enums = Enums::getInstance($enumInstance);
        $enum = $enums->getEnum($enumId);
        $field = $enum->getField($fieldId);
        $type = $field->getType();

        if($type == 'DB_GeoFormula') {
            return 'st_geomfromtext(\''.$value['value'].'\', 4326)';
        }
        if($type == 'DB_MapserverLayer'){
            $shape = $type::getShape($enumInstance,$value, $fieldId, $enumId);
            return 'st_geomfromtext(\''.$shape->toWkt().'\', 4326)';

        }
        if($type == 'DB_Enum'){
            $prop = $field->getProperties();
            $nextEnum = $enums->getEnum($prop['_enum']);
            $nextField = $nextEnum->getField($prop['field']);

            return self::getShape($enumInstance, $value[BaseType::REF_TYPE_VALUE_HEADER], $nextField->getId(), $nextEnum->getId());
        }
    }
    public static  function validateProp($params)
    {
        $props = $params['props'];
        $str = $props['value'];
        $geo = new geoFormula();
        $str = 'return $geo->' . $str . '->getValue();';
        $str = @eval($str);

        if ($geo->error != null) {
            throw new EnumException($geo->error);
        }
        if($str == false){
            throw new EnumException("La f&oacute;rmula no est&aacute; formada correctamente.");
        }
        return array();
    }
    public static function showInReport(){
        return false;
    }
}

class geoFormula
{
    public $lastValue;
    public $toWKT;
    public $type;
    public $error;
    public function __construct()
    {
        $this->toWKT = false;
        $this->error = null;
        $this->lastValue = null;

    }
    public function getValue(){
        if($this->type == 'wkt'){
            return 'st_astext('.$this->lastValue.'::geometry)';
        }
        return $this->lastValue;
    }
    public function toWkt(){
        $this->type = 'wkt';
    }
    public function checkValid($expecting = null, $operator, $needResult){
        if ($expecting != null && $this->type != $expecting) {
            $this->error = "El operador $operator espera $expecting, pero la operaci&oacute;n anterior devolvi&oacute;".
                " {$this->type} ";
        }
        else if ($needResult && $this->lastValue != null) {
            $this->error = "El operador $operator no necesita ning&uacute;n valor calculado pero hubo una".
                " operaci&oacute;n antes.";
        }
    }
    public function toNumber(){

        $this->type = 'number';
    }
    public function toBool(){
        $this->type = 'bool';
    }

    public function buffer($a,$b){
        if(is_null($b))
        {
            $s =$a;
            $b = $a;
            $a = $this->lastValue;
        }
        $this->checkValid(null,'buffer', false);
        $this->lastValue ="ST_Buffer($a::geography ,$b)";
        $this->toWkt();
        return $this;
    }
    public function interseccion($a,$b){
        if(is_null($b))
        {
            $s =$a;
            $b = $a;
            $a = $this->lastValue;
        }
        $this->checkValid(null,'interseccion', false);
        $this->lastValue = "st_intersection($a::geometry,$b::geometry)";
        $this->toWkt();
        return $this;

    }
    public function union($a){
        $str = 'array[';
        foreach ($a as $v) {
            $str.="$v::geometry,";
        }
        $str = substr($str,0,-1);
        $str .=']';
        $this->checkValid(null,'union', false);
        $this->lastValue = "st_union($str)";
        $this->toWkt();
        return $this;

    }
    public function diferencia($a,$b){
//        if(is_null($b))
//        {
//            $s =$a;
//            $b = $a;
//            $a = $this->lastValue;
//        }
        $this->checkValid(null,'diferencia', false);
        $this->lastValue = "st_difference($a::geometry,$b::geometry)";
        $this->toWkt();
        return $this;

    }
    public function contains($a, $b){
        $this->checkValid(null,'contains', false);
        $this->lastValue = "ST_Contains($a::geometry,$b::geometry)";
        $this->toBool();
        return $this;
    }
    public function area($a){

        $this->checkValid(null, 'area', true);
        $this->lastValue = "ST_Area($a::geometry)";
        $this->toNumber();
        return $this;
    }
    public function length($a){
        $this->checkValid(null,'length', true);
        $this->lastValue = "ST_Perimeter($a::geometry)";
        $this->toNumber();
        return $this;
    }

    public function suma($a){
        $this->checkValid('number', 'suma', true);
        $this->lastValue = "+ $a";
        $this->toNumber();
        return $this;
    }



}