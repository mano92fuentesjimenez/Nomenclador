<?php
/**
 * Created by PhpStorm.
 * User: Mano
 * Date: 07/06/2017
 * Time: 13:11
 */

class DB_MathFormula extends Formula{


    public static function getValueFromDB($enumInstance, $record, $value, $field, $connType)
    {
        if(is_numeric($value)){
            return $value;
        }
        return "F&oacute;rmula Matem&aacute;tica.";
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
            if ($t == 'DB_Number' || $t == 'DB_MathFormula') {
                continue;
            }
            else if ($t == 'DB_Enum') {
                $property = $field->getProperties();
                $nextEnum = $enums->getEnum($property['_enum']);
                $nextField = $nextEnum->getField($property['field']);
                $type = $nextField->getType();

                if($type =='DB_Number' || $type =='DB_MathFormula')
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


    public static function canChangeTo($enum, $field,$fromType, $toType)
    {
        return $toType == 'DB_Number' || $toType == 'DB_MathFormula';
    }

    public static function getAcceptedTypes($enum, $field)
    {
        return 'N&uacute;mero, Nomenclador que apunte a numero, o F&oacute;rmula matem&aacute;';
    }

    /**
     * Especifica si una formula por su complejidad en tiempo de cómputo necesita ser evaluada solo cuando lo pida el
     * usuario.
     * @return {bool}
     */
    public static function lazyInit($enum,$field)
    {
        return false;
    }

    /**
     * Función secundaria para evaluar una formula que es de tipo lazy.
     * @param $record {array}  Son todos los valores de la fila que se esta evaluando.
     * @param $value {mixed}   Es el valor guardado en base de datos del campo.
     * @param $field {mixed}   Son los metadatos del campo.
     * @param $connType {string}Es el tipo de coneccion a base de datos.
     * @return mixed            El objeto a interpetar por el renderizador en el grid del cliente.
     * @throws Exception
     */
    public static function evalFormula($enumInstance, $enum,$field,$record, $value, $connType)
    {
        if(is_numeric($value)){
            return $value;
        }
        foreach ($record as $key => $value) {
            if (is_array($value)) {
                $record[$key] = $value[BaseType::REF_TYPE_VALUE_HEADER];
            }
        }
        extract($record);
        $v = $field->getProperties();
        $v = $v['value'];
        $strToEval = 'return '.$v.';';
        return eval($strToEval);
    }

}