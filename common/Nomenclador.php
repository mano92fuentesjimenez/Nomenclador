<?php

require_once(CARTOWEB_HOME . 'common/CwSerializable.php');
class NomencladorRequest extends CwSerializable
{
    public $value;
    public $action;

    public function unserialize($struct)
    {
        $this->value = self::unserializeValue($struct, 'value');
        $this->action = self::unserializeValue($struct, 'action');
    }
}

class NomencladorResult extends CwSerializable
{
    public $resp;
    public $error;
    public $error_type;
    public $action;

    public function unserialize($struct)
    {
        $this->resp = self::unserializeValue($struct, 'resp');
        $this->error = self::unserializeValue($struct, 'error');
        $this->action = self::unserializeValue($struct, 'action');
        $this->error_type= self::unserializeValue($struct, 'error_type');
    }
}