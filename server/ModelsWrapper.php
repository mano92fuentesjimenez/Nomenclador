<?php

/**
 * Created by PhpStorm.
 * User: tony
 * Date: 9/6/18
 * Time: 3:42 PM
 */
class ModelsWrapper
{
    static $fieldsField = 'fields';
    static $wrappers = [
        'id'=>'id',
        'name'=>'label',
        'description'=>'extendedLabelField',
        'revision'=>'revision'
    ];

    static $fieldsWrapper = [
        'id'=>'id',
        'header'=>'label',
        'type'=>'type',
        'order'=>'order',
        'needed'=>'required'
    ];

    static $fieldsTypeWrapper = [
        'DB_String'=>'string',
        'DB_Images'=>'image',
        'DB_Enum'=>'enum',
        'DB_EnumChooser'=>'enumChooser',
        'DB_Bool'=>'boolean',
        'DB_Date'=>'date',
        'DB_Number'=>'number',
        'DB_Table'=>'table'
//        'DB_Enum'=>'enum',
    ];

    static public function order_fields($a, $b)
    {
        if (!array_key_exists('order',$a) || $a['order'] == $b['order']) {
            return 0;
        }
        return ($a['order'] < $b['order']) ? -1 : 1;
    }

    static public function parseEnum($enum)
    {
        $enumsResult= array();
        $wrappers = self::$wrappers;

        foreach ($enum as $key => $property){
            if(array_key_exists($key,$wrappers)){
                $enumsResult[$wrappers[$key]] = $property;
            }elseif ($key == self::$fieldsField){
                $enumsResult[self::$fieldsField] = self::parseFields(
                    $enumsResult, $property
                );
            }
        }

        $enumsResult['revision'] = time();

        return $enumsResult;
    }

    static public function parseFields(&$model, $fields){

        $typesWrapper = self::$fieldsTypeWrapper;
        $fieldsWrapper = self::$fieldsWrapper;

        $enumfields = array();
        foreach ($fields as $fieldId => $field){
            if(array_key_exists('isDenom',$field) && $field['isDenom'])
                $model['labelField'] = $fieldId;

            $fieldProps = array();
            foreach ($field as $fieldProp => $fieldValue){
                if(array_key_exists($fieldProp,$fieldsWrapper)){
                    if($fieldProp == 'type'){
                        if(array_key_exists($fieldValue,$typesWrapper)){
                            $fieldValue = $typesWrapper[$fieldValue];
                        }else{
                            continue;
                        }
                    }

                    $fieldProps[$fieldsWrapper[$fieldProp]] = $fieldValue;
                }
            }

            $enumfields[] = $fieldProps;
        }
//todo: ordenar, poner campos k faltan de los tipos de enum,y revisar bien los campos k kedan

//        $enumfields = sort($enumfields,self::order_fields);

        return $enumfields;
    }

}