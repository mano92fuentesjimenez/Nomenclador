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

    private static $instances;
    private function __construct(){}

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
            $instances[$enumInstance] = new ActionManager();
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

    public function callPreLoadActions(&$offset, &$limit, &$idRow, &$fieldsToGet, &$inData, &$loadAllData, &$where){
        $r = null;
        $actions = $this->getActions('load','pre');

        foreach ($actions as $action) {
            $p = $this->getPlugin($action);
            $r = $p['server']->{$p['action']}($this, $offset, $limit, $idRow, $fieldsToGet, $inData, $loadAllData, $where);
            if($r==self::STOP)
                break;
        }
        return $r;
    }
    public function callPostLoadActions(&$data){
        $actions = $this->getActions('load','post');

        foreach ($actions as $action){
            $p = $this->getPlugin($action);
            $p['server']->{$p['action']}($this, $data);
        }
    }
    public function callPreSubmitActions(&$data){

        //del
        $actions = $this->getActions('del','pre');
        foreach ($actions as $action){
            $p = $this->getPlugin($action);

            if($p['server']->{$p['action']}($this, $data['del']) == self::STOP){
                unset($data['del']);
                break;
            }
        }

        //mod
        $actions = $this->getActions('mod','pre');
        foreach ($actions as $action){
            $p = $this->getPlugin($action);

            $r = $p['server']->{$p['action']}($this, $data['mod']);

            if($r == self::CONVERT_TO_ADD){
                foreach ($data['mod'] as $record){
                    unset($record[PrimaryKey::ID]);
                    $data['add'][] = $record;
                }
            }
            if($r == self::STOP || $r == self::CONVERT_TO_ADD){
                unset($data['mod']);
                break;
            }
        }

        //add
        $actions = $this->getActions('add','pre');
        foreach ($actions as $action){
            $p = $this->getPlugin($action);
            if($p['server']->{$p['action']}($this, $data['mod']) == self::STOP)
                break;
        }

    }
    public function callCountActions(&$where){
        $actions = $this->getActions('count','pre');
        $r = null;

        foreach ($actions as $action){
            $p = $this->getPlugin($action);
            $r = $p['server']->{$p['action']}($this, $where);
        }
        return $r;
    }
    public function callPostAddActions(&$data){
        $actions = $this->getActions('add','post');

        foreach ($actions as $action){
            $p = $this->getPlugin($action);
            $p['server']->{$p['action']}($this,$data);
        }
    }

    public function callPreEnumAddActions($enumInstance,$enum){
        $actions = $this->getActions('addEnum','pre');
        foreach ($actions as $action){
            $p = self::getPlugin($action);
            $v = $p['server']->{$p['action']}($enumInstance,$enum);
            if($v ==Enum::STOP)
                throw new Exception("La adicion del nomenclador ha sido refutada por el plugin {$p['plugin']}");
        }

    }
    public function callPostEnumAddActions($enumInstance,$enum){
        $actions = $this->getActions('addEnum','post');
        foreach ($actions as $action){
            $p = self::getPlugin($action);
            $p['server']->{$p['action']}($enumInstance,$enum);
        }
    }
    public function callPreEnumModActions($enumInstance,$enum){
        $actions = $this->getActions('modEnum','pre');
        foreach ($actions as $action){
            $p = self::getPlugin($action);
            $v = $p['server']->{$p['action']}($enumInstance,$enum);
            if($v ==Enum::STOP)
                throw new Exception("La modificacion del nomenclador ha sido refutada por el plugin {$p['server']}");
        }

    }
    public function callPostEnumModActions($enumInstance,$enum){
        $actions = $this->getActions('modEnum','post');
        foreach ($actions as $action){
            $p = self::getPlugin($action);
            $p['server']->{$p['action']}($enumInstance,$enum);
        }
    }

    public function callPreEnumRemActions($enumInstance,$enum){
        $actions = $this->getActions('remEnum','pre');
        foreach ($actions as $action) {
            $p = self::getPlugin($action);
            $v = $p['server']->{$p['action']}($enumInstance, $enum);
            if ($v == Enum::STOP)
                throw new EnumActionRejected("La modificacion del nomenclador ha sido refutada por el plugin {$p['server']}");

        }
    }
    public function callPostEnumRemActions($enumInstance,$enum){
        $actions = $this->getActions('remEnum','post');
        foreach ($actions as $action){
            $p = self::getPlugin($action);
            $p['server']->{$p['action']}($enumInstance,$enum);
        }

    }

}