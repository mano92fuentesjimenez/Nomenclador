<?php
/**
 * Created by PhpStorm.
 * User: mano
 * Date: 22/08/18
 * Time: 10:30
 */

interface EnumsActions {

    /***
     * ACCIONES SOBRE LOS NOMENCLADORES
     */
    /**
     * Cualquier accion (adicionar, modificar o eliminar) sobre un nomenclador
     * @param $instance         {string}            Instancia del nomenclador
     * @param Enum $enum        {Enum}              Clase con el nomenclador
     * @return {ActionManagerResult|*}
     */
    function enumActions($instance,Enum $enum);

    /**
     * ACCIONES SOBRE LOS RECORDS
     */

    /**
     * Accion de precarga de los registros de un nomenclador
     * @param Enum $enum
     * @param $offset
     * @param $limit
     * @param $idRow
     * @param $fieldsToGet
     * @param $inData
     * @param $loadAllData
     * @param $where
     * @return {ActionManagerResult|*}
     */
    function enumPreLoad(EnumQuerier $enum, $offset, $limit , $idRow, $fieldsToGet, $inData, $loadAllData, $where, $extraParams);
    /**
     * Accion de postcarga de un nomenclador
     * @param Enum $enum
     * @param $data
     * @return {ActionManagerResult|*}
     */
    function enumPostLoad(Enum $enum, $data, $extraParams);

    /**
     * Accion de conteo de los registros de un nomenclador
     * @param Enum $enum
     * @param $where
     * @return mixed
     */
    function enumCountAction(Enum $enum, $where, $extraParams);

    /**
     * Accion previa de guardado (adicionar, modificar, eliminar) de los records de nomenclador
     * @param Enum $enum
     * @param $data
     * @return {ActionManagerResult|*}
     */
    function enumRowPreSubmitAction(Enum $enum, $data);

    /**
     * Accion posterior a la adicion de un nomenclador
     * @param Enum $enum
     * @param $data
     * @return {ActionManagerResult|*}
     */
    function enumRowPostAddAction(Enum $enum, $data, $originalData);
    /**
     * Accion posterior a la modificacion de un nomenclador
     * @param Enum $enum
     * @param $data
     * @return {ActionManagerResult|*}
     */
    function enumRowPostModAction(Enum $enum, $data, $originalData);

}

class ActionManager
{
    private $actions;

    const STOP = 1;
    const CONVERT_TO_ADD = 2;
    const CONTINUE_P = 3;
    private $enumInstance;
    private $extraParams;

    private static $instances;
    private function __construct($enumInstance){
        $this->enumInstance = $enumInstance;
    }
    public function setExtraParams($extraParams){
        $this->extraParams = $extraParams;
    }

    /**
     * @param $enumInstance
     * @return ActionManager
     */
    public static function getInstance($enumInstance){
        if(is_null(self::$instances))
            self::$instances = array();
        $proj = ServerContext::getInstance()->getProjectHandler()->getProjectName();

        if(is_null(self::$instances[$proj]))
            self::$instances[$proj] = array();
        $instances = &self::$instances[$proj];

        if(is_null($instances[$enumInstance]))
            $instances[$enumInstance] = new ActionManager($enumInstance);
        return $instances[$enumInstance];
    }

    private static function getPlugin($action){

        $v = array();
        $arr = explode('.',$action);
        $plugin = reset($arr);
        $action = end($arr);
        $server = ServerPlugin::requirePlugin($plugin);

        $v['server'] = $server;
        $v['action'] = $action;
        $v['plugin'] = $plugin;
        return $v;
    }

    public function getActions($which,$when){
        if(isset($this->actions)){
            if (is_array($this->actions) &&
                is_array($this->actions[$which]) &&
                is_array($this->actions[$which][$when])) {

                return $this->actions[$which][$when];
            }
        }
        return null;
    }
    public function setActions($actions){
        $this->actions = $actions;
    }

    public function callPreLoadActionsForEnum($enum, &$offset, &$limit, &$idRow, &$fieldsToGet, &$inData, &$loadAllData, &$where){
        $r = null;
        $actions = $this->getActions('load','pre');

        foreach ($actions as $action) {
            $p = $this->getPlugin($action);
            $r = $p['server']->{$p['action']}($enum, $offset, $limit, $idRow, $fieldsToGet, $inData, $loadAllData, $where, $this->extraParams);

            if($r instanceof ActionManagerResult && $r->type == self::STOP)
                break;
        }
        return $r;
    }
    public function callPostLoadActionsForEnum($enum, &$data){
        $actions = $this->getActions('load','post');

        foreach ($actions as $action){
            $p = $this->getPlugin($action);
            $p['server']->{$p['action']}($enum, $data,$this->extraParams);
        }
    }
    public function callPreSubmitActionsForEnum($enum,&$data){

        //del
        if(array_key_exists('del',$data) && is_array($data['del']) && count($data['del'])){
            $actions = $this->getActions('del','pre');
            foreach ($actions as $action){
                $p = $this->getPlugin($action);
                $r = $p['server']->{$p['action']}($enum, $data['del'],$this->extraParams);
                if($r instanceof ActionManagerResult && $r->type == self::STOP){
                    unset($data['del']);
                    break;
                }
            }
        }

        if(array_key_exists('mod',$data) && is_array($data['mod']) && count($data['mod'])){
            //mod
            $actions = $this->getActions('mod','pre');
            foreach ($actions as $action){
                $p = $this->getPlugin($action);

                $r = $p['server']->{$p['action']}($enum, $data['mod'],$this->extraParams);

                if($r instanceof ActionManagerResult) {
                    if ($r->type == self::CONVERT_TO_ADD) {
                        foreach ($data['mod'] as $record) {
                            unset($record[PrimaryKey::ID]);
                            $data['add'][] = $record;
                        }
                    }
                    if ($r->type == self::STOP || $r->type == self::CONVERT_TO_ADD) {
                        unset($data['mod']);
                        $this->throwException($r,$p['server']);
                    }
                }
            }
        }

        if(array_key_exists('add',$data) && is_array($data['add']) && count($data['add'])){
            //add
            $actions = $this->getActions('add','pre');
            foreach ($actions as $action){
                $p = $this->getPlugin($action);
                $r = $p['server']->{$p['action']}($enum, $data['add'],$this->extraParams);
                if($r instanceof ActionManagerResult && $r->type == self::STOP) {
                   $this->throwException($r,$p['server']);
                }
            }
        }

    }
    public function callCountActions($enum, &$where){
        $actions = $this->getActions('count','pre');
        $r = null;

        foreach ($actions as $action){
            $p = $this->getPlugin($action);
            $r = $p['server']->{$p['action']}($enum, $where,$this->extraParams);
        }
        return $r;
    }
    public function callPostAddActions($enum, &$data, $originalData){
        $actions = $this->getActions('add','post');

        foreach ($actions as $action){
            $p = $this->getPlugin($action);
            $p['server']->{$p['action']}($enum,$data,$originalData,$this->extraParams);
        }
    }

    public function callPostModActions($enum, $data, $orgData){
        $actions = $this->getActions('mod','post');

        foreach ($actions as $action){
            $p = $this->getPlugin($action);
            $p['server']->{$p['action']}($enum,$data,$orgData,$this->extraParams);
        }
    }

    public function callPreEnumAddActions($enum){
        $actions = $this->getActions('addEnum','pre');
        foreach ($actions as $action){
            $p = self::getPlugin($action);
            $r = $p['server']->{$p['action']}($this->enumInstance,$enum,$this->extraParams);
            if($r instanceof ActionManagerResult && $r->type == self::STOP)
                $this->throwException($r,$p['plugin']);
        }

    }
    public function callPostEnumAddActions($enum){
        $actions = $this->getActions('addEnum','post');
        foreach ($actions as $action){
            $p = self::getPlugin($action);
            $p['server']->{$p['action']}($this->enumInstance,$enum,$this->extraParams);
        }
    }
    public function callPreEnumModActions($enum){
        $actions = $this->getActions('modEnum','pre');
        foreach ($actions as $action){
            $p = self::getPlugin($action);
            $r = $p['server']->{$p['action']}($this->enumInstance,$enum,$this->extraParams);
            if($r instanceof ActionManagerResult && $r->type == self::STOP)
                $this->throwException($r,$p['plugin']);
        }

    }
    public function callPostEnumModActions($enum){
        $actions = $this->getActions('modEnum','post');
        foreach ($actions as $action){
            $p = self::getPlugin($action);
            $p['server']->{$p['action']}($this->enumInstance,$enum,$this->extraParams);
        }
    }

    public function callPreEnumRemActions($enum){
        $actions = $this->getActions('remEnum','pre');
        foreach ($actions as $action) {
            $p = self::getPlugin($action);
            $r = $p['server']->{$p['action']}($this->enumInstance, $enum,$this->extraParams);
            if($r instanceof ActionManagerResult && $r->type == self::STOP)
               $this->throwException($r,$p['plugin']);

        }
    }
    public function callPostEnumRemActions($enum){
        $actions = $this->getActions('remEnum','post');
        foreach ($actions as $action){
            $p = self::getPlugin($action);
            $p['server']->{$p['action']}($this->enumInstance,$enum,$this->extraParams);
        }

    }

    public function callOnExceptionActions( $enum, $message){
        $actions = $this->getActions('exception','post');
        if(count($actions)==0)
            throw new CartowebException($message);
        foreach ($actions as $action){
            $p = self::getPlugin($action);
            $p['server']->{$p['action']}($this->enumInstance,$enum, $message,$this->extraParams);
        }
    }

    /**
     *
     * @param $compInitializing  values=[DataSource, Enums, SimpleTree]
     */
    public function callInstanceAddingActions($compInitializing){
        $actions = $this->getActions('enumInstanceAdding','pre');
        foreach ($actions as $action){
            $p = self::getPlugin($action);
            $p['server']->{$p['action']}($this->enumInstance, $compInitializing,$this->extraParams);
        }
    }
    public function callUndefinedExistDataSourceActions( $idDataSource){
        $actions = $this->getActions('undefinedDataSource','pre');
        foreach ($actions as $action){
            $p = self::getPlugin($action);
            $p['server']->{$p['action']}($this->enumInstance, $idDataSource,$this->extraParams);
        }
    }
    public function throwException($actionResult, $pluginServer){
        $s = "La modificacion del nomenclador ha sido refutada por el plugin {$pluginServer}";
        if(isset($actionResult->message) && $actionResult->message !='')
            $s = $actionResult->message;
        throw new EnumActionRejected($s);
    }

}
class ActionManagerResult
{
    public $type;
    public $message;

    public function __construct($type, $message)
    {
        $this->type = $type;
        $this->message = $message;
    }
}