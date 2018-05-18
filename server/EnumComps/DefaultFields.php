<?php
/**
 * Created by PhpStorm.
 * User: Mano
 * Date: 07/06/2017
 * Time: 13:25
 */
class DefaultFields
{

    public $defaultFields;
    public $enumInstance;

    private function __construct($enumInstance)
    {
        $this->enumInstance = $enumInstance;
        $conn =EnumsUtils::getConn();
        $sql = "select * from mod_nomenclador.defaultfields";


        $content = $conn->getAll($sql, null, DB_FETCHMODE_ASSOC);
        EnumsUtils::checkDBresponse($content);
        $content = reset($content);
        $this->defaultFields = json_decode($content['v'], true);
    }

    public static function getDefaultFieldsPath()
    {
        return EnumsUtils::getConfPath('defaultFields.json');
    }

    private static $instance;

    public static function getInstance($enumInstance)
    {
        if(!$enumInstance)
            throw new Exception();
        if (!self::$instance) {
            self::$instance = new DefaultFields($enumInstance);
        }
        return self::$instance;
    }
}
