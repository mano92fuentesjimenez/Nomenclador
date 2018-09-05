<?php
/**
 * Created by PhpStorm.
 * User: mano
 * Date: 22/08/18
 * Time: 10:30
 */

class ActionManager
{
    private $actions;

    const STOP = 1;
    const CONVERT_TO_ADD = 2;
    const CONTINUE_P = 3;
    private $enumInstance;

    private static $instances;
    private function __construct($enumInstance){
        $this->enumInstance = $enumInstance;
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
            $r = $p['server']->{$p['action']}($enum, $offset, $limit, $idRow, $fieldsToGet, $inData, $loadAllData, $where);

            if($r instanceof ActionManagerResult && $r->type == self::STOP)
                break;
        }
        return $r;
    }
    public function callPostLoadActionsForEnum($enum, &$data){
        $actions = $this->getActions('load','post');

        foreach ($actions as $action){
            $p = $this->getPlugin($action);
            $p['server']->{$p['action']}($enum, $data);
        }
    }
    public function callPreSubmitActionsForEnum($enum,&$data){

        //del
        $actions = $this->getActions('del','pre');
        foreach ($actions as $action){
            $p = $this->getPlugin($action);
            $r = $p['server']->{$p['action']}($enum, $data['del']);
            if($r instanceof ActionManagerResult && $r->type == self::STOP){
                unset($data['del']);
                break;
            }
        }

        //mod
        $actions = $this->getActions('mod','pre');
        foreach ($actions as $action){
            $p = $this->getPlugin($action);

            $r = $p['server']->{$p['action']}($enum, $data['mod']);

            if($r instanceof ActionManagerResult) {
                if ($r->type == self::CONVERT_TO_ADD) {
                    foreach ($data['mod'] as $record) {
                        unset($record[PrimaryKey::ID]);
                        $data['add'][] = $record;
                    }
                }
                if ($r->type == self::STOP || $r->type == self::CONVERT_TO_ADD) {
                    unset($data['mod']);
                    break;
                }
            }
        }

        //add
        $actions = $this->getActions('add','pre');
        foreach ($actions as $action){
            $p = $this->getPlugin($action);
            $r = $p['server']->{$p['action']}($enum, $data['mod']);
            if($r instanceof ActionManagerResult && $r->type == self::STOP) {
                break;
            }
        }

    }
    public function callCountActions($enum, &$where){
        $actions = $this->getActions('count','pre');
        $r = null;

        foreach ($actions as $action){
            $p = $this->getPlugin($action);
            $r = $p['server']->{$p['action']}($enum, $where);
        }
        return $r;
    }
    public function callPostAddActions($enum, &$data){
        $actions = $this->getActions('add','post');

        foreach ($actions as $action){
            $p = $this->getPlugin($action);
            $p['server']->{$p['action']}($enum,$data);
        }
    }

    public function callPreEnumAddActions($enum){
        $actions = $this->getActions('addEnum','pre');
        foreach ($actions as $action){
            $p = self::getPlugin($action);
            $r = $p['server']->{$p['action']}($this->enumInstance,$enum);
            if($r instanceof ActionManagerResult && $r->type == self::STOP)
                $this->throwException($r,$p['plugin']);
        }

    }
    public function callPostEnumAddActions($enum){
        $actions = $this->getActions('addEnum','post');
        foreach ($actions as $action){
            $p = self::getPlugin($action);
            $p['server']->{$p['action']}($this->enumInstance,$enum);
        }
    }
    public function callPreEnumModActions($enum){
        $actions = $this->getActions('modEnum','pre');
        foreach ($actions as $action){
            $p = self::getPlugin($action);
            $r = $p['server']->{$p['action']}($this->enumInstance,$enum);
            if($r instanceof ActionManagerResult && $r->type == self::STOP)
                $this->throwException($r,$p['plugin']);
        }

    }
    public function callPostEnumModActions($enum){
        $actions = $this->getActions('modEnum','post');
        foreach ($actions as $action){
            $p = self::getPlugin($action);
            $p['server']->{$p['action']}($this->enumInstance,$enum);
        }
    }

    public function callPreEnumRemActions($enum){
        $actions = $this->getActions('remEnum','pre');
        foreach ($actions as $action) {
            $p = self::getPlugin($action);
            $r = $p['server']->{$p['action']}($this->enumInstance, $enum);
            if($r instanceof ActionManagerResult && $r->type == self::STOP)
               $this->throwException($r,$p['plugin']);

        }
    }
    public function callPostEnumRemActions($enum){
        $actions = $this->getActions('remEnum','post');
        foreach ($actions as $action){
            $p = self::getPlugin($action);
            $p['server']->{$p['action']}($this->enumInstance,$enum);
        }

    }

    public function callOnExceptionActions( $enum, $message){
        $actions = $this->getActions('exception','post');
        if(count($actions)==0)
            throw new CartowebException($message);
        foreach ($actions as $action){
            $p = self::getPlugin($action);
            $p['server']->{$p['action']}($this->enumInstance,$enum, $message);
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
            $p['server']->{$p['action']}($this->enumInstance, $compInitializing);
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

    public function __constructor($type, $message)
    {
        $this->type = $type;
        $this->message = $message;
    }
}