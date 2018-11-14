<?php

require_once(CARTOWEB_HOME . 'common/CwSerializable.php');
require_once(CARTOWEB_HOME.'common/Restful.php');

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

class NomencladorRestAdapter implements PluginRestFulAdapter{

    static function buildRequest($params){
        $req =  new NomencladorRequest();
        $req->action = $params['action'];
        $req->value=array_merge($params['arguments'],array(
            'instanceName'=>$params['arguments']['instance']
        ));
        return $req;
    }

    static function handleResult($result, RestFulResponse $response, $arguments){
        if(isset($result->error)){
            $response::error(
                $result->error['message'],
                $result->code
            );
        }else{
            $response->send(json_encode($result->resp));
        }
    }
}