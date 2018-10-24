<?php
/**
 * Created by PhpStorm.
 * User: Mano
 * Date: 07/06/2017
 * Time: 13:24
 */


class Refs
{

    public $refs;
    public $enumInstance;

    private function __construct($enumInstance)
    {
//        $p = Refs::getRefsPath();
//
//        if (!file_exists($p)) {
//            $f = array();
//            file_put_contents($p, json_encode($f, JSON_FORCE_OBJECT));
//            chmod($p, 0777);
//            $this->refs = $f;
//            return;
//        }
//        $refs = file_get_contents($p);
        $this->enumInstance = $enumInstance;
        $conn = EnumsUtils::getConn();
        $projName = EnumsUtils::getProjectName();
        $sql = "select * from mod_nomenclador.refs where proj = '$projName' and enum_instance ='$enumInstance'";

        $refs = $conn->getAll($sql, null, DB_FETCHMODE_ASSOC);
        EnumsUtils::checkDBresponse($refs);
        if(count($refs)==0){
            $defaultV = '{}';
            $conn->simpleQuery("insert into mod_nomenclador.refs(v,proj, enum_instance) values ('$defaultV', '$projName','$enumInstance')");
            $refs = array(array('v'=>$defaultV));
        }
        $refs = reset($refs);
        $this->refs = json_decode($refs['v'], true);
    }

    private static $instance;

    public static function getInstance($enumInstance)
    {
        if(!$enumInstance)
            throw new Exception();
        if (!array_key_exists($enumInstance, self::$instance)) {
            self::$instance[$enumInstance] = new Refs($enumInstance);
        }
        return self::$instance[$enumInstance];
    }


    public function addRefs($refs)
    {
        if (count($refs) > 0) {
            $r = &$this->refs;
            foreach ($refs as $value) {
                $to = $value['toEnum'] . ':' . $value['toField'];
                $from = $value['fromEnum'] . ':' . $value['fromField'];

                if (!isset($r[$to]))
                    $r[$to] = array();
                $r[$to][$from] = 1;
            }
        }
    }

    public function addImportedRefs($importdeRefs)
    {

        foreach ($importdeRefs as $baseKey => $value) {
            foreach ($value as $refKey => $v) {
                $this->refs[$baseKey][$refKey] = $v;
            }
        }
    }

    public function delRefs($refs)
    {
        if (count($refs) > 0) {

            $r = &$this->refs;
            foreach ($refs as $key => $value) {
                $from = $value['fromEnum'] . ':' . $value['fromField'];
                $to = $value['toEnum'] . ':' . $value['toField'];
                if (array_key_exists($to, $r)) {
                    unset($r[$to][$from]);
                }
                if (count($r[$to]) == 0) {
                    unset($r[$to]);
                }
            }
        }
    }

    public static function getRefsPath()
    {
        return EnumsUtils::getConfPath("refs.json");
    }

    public function saveRefs()
    {
//
//        $p = Refs::getRefsPath();
//        $refs = json_encode($this->refs);
//        file_put_contents($p, $refs);

        $conn = EnumsUtils::getConn();
        $projName = EnumsUtils::getProjectName();
        $data = json_encode($this->refs);

        $sql = "update mod_nomenclador.refs set v='$data' where proj= '$projName' and enum_instance='{$this->enumInstance}'";
        $conn->simpleQuery($sql);
    }

    public function getReferencesToEnum($enum)
    {
        $r = &$this->refs;
        $key = $enum->getId() . ':';

        $toR = array();
        foreach ($r as $refenced => $ref) {
            if (strpos($refenced, $key) === 0) {
                if (count($ref) > 0)
                    $toR[$refenced] = $ref;
            }
        }
        return count($toR) == 0 ? false : $toR;
    }

    public function getReferencesTo($field, $enum)
    {
        return isset($this->refs[$enum . ':' . $field]) ? $this->refs[$enum . ':' . $field] : null;
    }

    public function deleteReferencesFrom($enum)
    {
        $refs = array();

        foreach ($enum->getFields() as $value) {
            $field = new Field($value);
            $type = $field->getType();
            $prop = $field->getProperties();
            if ($type::getValueType() == BaseType::REF) {
                $refs[] = array(
                    'fromEnum' => $enum->getId(),
                    'fromField' => $field->getId(),
                    'toEnum' => $prop['_enum'],
                    'toField' => $prop['field']
                );
            }
        }
        $this->delRefs($refs);
    }

    public function removeAll()
    {
        unlink(self::getRefsPath());
    }

    public static function getField($ref)
    {
        $arr = explode(':', $ref);
        return $arr[1];
    }

    public static function getEnum($ref)
    {
        $arr = explode(':', $ref);
        return $arr[0];
    }


}