<?php
/**
 * Created by PhpStorm.
 * User: Mano
 * Date: 07/06/2017
 * Time: 13:24
 */

class SimpleTree
{
    public $simpleTree;
    public $enumInstance;

    private function __construct($enumInstance)
    {
//        $path_to_simpleTree = SimpleTree::getSimpleTreePath();
//
//        if (!file_exists($path_to_simpleTree)) {
//            $data = array(
//                'childs' => array(),
//                'idNode' => 'Nomencladores'
//            );
//            file_put_contents($path_to_simpleTree, json_encode($data));
//            chmod($path_to_simpleTree, 0777);
//        }
//        $this->simpleTree = file_get_contents($path_to_simpleTree);

        $this->enumInstance = $enumInstance;
        $conn = EnumsUtils::getConn();
        $projName = EnumsUtils::getProjectName();
        $simpleTree = $this->getData($conn);

        if(count($simpleTree) == 0){
            $defaultV =json_encode($this->getDefaultValue());
            $conn->simpleQuery("insert into mod_nomenclador.simpletree(v,proj,enum_instance) values ('$defaultV', '$projName','$enumInstance')");

            $actions = ActionManager::getInstance($this->enumInstance);
            $actions->callInstanceAddingActions($this);
            $simpleTree = $this->getData($conn);
        }
        $simpleTree = reset($simpleTree);
        $this->simpleTree = json_decode($simpleTree['v'], true);
        $this->simpleTree = $this->convert($this->simpleTree);
    }
    private function convert($s){
        if(isset($s['childs'])){
            $s['childs'] = array_values($s['childs']);
            foreach ($s['childs'] as &$v){
                $v = $this->convert($v);
            }
        }
        return $s;
    }
    private function getDefaultValue(){
        return array('childs'=>array(),'idNode' =>"Nomencladores");
    }
    private function getData($conn){
        $projName = EnumsUtils::getProjectName();
        $enumInstance = $this->enumInstance;
        $sql = "select * from mod_nomenclador.simpletree where proj = '$projName' and enum_instance='$enumInstance'";

        $simpleTree= $conn->getAll($sql, null, DB_FETCHMODE_ASSOC);
        EnumsUtils::checkDBresponse($simpleTree);
        return $simpleTree;
    }

    private static $instance;

    public static function getInstance($enumInstance)
    {
        if(!isset($enumInstance))
            throw new Exception();

        if (!self::$instance) {
            self::$instance = new SimpleTree($enumInstance);
        }
        return self::$instance;
    }

    public function walk($path, $f)
    {

        $simpleTree = &$this->simpleTree;
        if ($path == '') {
            $f('', $simpleTree);
            return;
        }

        $words = explode('/', $path);
        $last = array_pop($words);

        array_shift($words);
        array_shift($words);

        $walking = &$simpleTree['childs'];
        foreach ($words as $value) {
            $node = &$this->findNodeWithId($value,$walking);
            if (is_null($node)) {
                throw new EnumException('El arbol de nomencladores ha cambiado mientras usted trabajaba, recargue para
                ver los cambios');
            }
            if(!isset($node['childs'])){
                throw new EnumException('Un nomenclador no tiene hijos');
            }
            $walking =&$node['childs'];
        }
        $f($last, $walking);
    }
    private function &findNodeWithId($id, &$nodes){
        foreach ($nodes as &$node){
            if($node['idNode'] == $id) {
                return $node;
            }
        }
        return null;
    }

    public function walkAllNodes(&$start, $applyF)
    {
//        foreach ($start as $key => &$value) {
//            $applyF($value);
//            if($key == 'childs'){
//                $this->walkAllNodes($value, $applyF);
//            }
//        }

        if (isset($start['childs'])) {
            $applyF($start);
            foreach ($start['childs'] as $key => &$value) {
                $this->walkAllNodes($value, $applyF);
            }
        }
    }

    public function saveSimpleTree()
    {
//
//        $path = SimpleTree::getSimpleTreePath();
//        file_put_contents($path, json_encode($this->simpleTree));

        $conn = EnumsUtils::getConn();
        $projName = EnumsUtils::getProjectName();
        $data = json_encode($this->simpleTree);

        $sql = "update mod_nomenclador.simpletree set v='$data' where proj= '$projName' and enum_instance='{$this->enumInstance}'";
        $conn->simpleQuery($sql);
    }

    public static function getSimpleTreePath()
    {
        return EnumsUtils::getConfPath('simpleTree.json');
    }

    public function modRank($path, $name)
    {
        $this->walk($path, function ($last, &$walking) use ($name) {
            $walking[$last]['text'] = $name;
        });

    }

    public function addRank($path)
    {
        $this->walk($path, function ($last, &$walking) {
            //si alguien tiene una ventana de nomenclador abierta desde hace un tiempo sin hacerle cambios, cuando
            //anhada una nueva categoria, si alguien ya habia construido un subarbol con root igual al nombre de
            //la categoria, este subarbol se va a eliminar.

            $node = $this->findNodeWithId($last,$walking);
            if (!is_null($node) ) {
                throw new EnumException('El arbol de categorias se ha modificado mientras usted trabajaba, refresque el arbol de categorias');
            }
            $id = $last . '-' . (time() * rand(1, 100));
            $walking[] = array(
                'childs' => array(),
                'idNode' => $id,
                'text' => $last
            );
        });

    }

    public function addEnum($path)
    {
        $this->walk($path, function ($last, &$walking) {
            $walking[$last] = array('idNode' => $last);
        });
    }

    public function addImportedTree($importedtree, $prefixPath)
    {

        $this->walk($prefixPath, function ($last, &$walking) use ($importedtree, $prefixPath) {
            if ($prefixPath == '') {
                $walking['childs'] = $importedtree;
                return;
            }

            $intersect = EnumsUtils::areAnyKeysRepeated($importedtree, $walking[$last]['childs']);
            if (count($intersect) > 0) {
                $overlapedNodes = '';

                foreach ($intersect as $value) {
                    $overlapedNodes .= $walking[$last][$value]['text'] . ', ';
                }
                $overlapedNodes = substr($overlapedNodes, 0, -1);
                throw new EnumException("No se puede importar en el &aacute;rbol en la ruta dada, pu&eacute;s los nodos 
                '$overlapedNodes' se van a sobreescribir");
            }

            $walking[$last]['childs'] = array_merge($walking[$last]['childs'], $importedtree);

        });

    }

    public function delRank($path)
    {

        $self = $this;
        $this->walk($path, function ($last, &$walking) use ($self) {
            $enums = Enums::getInstance($self->enumInstance);

            $self->canRemoveEnums($walking[$last], $enums);
            $self->removeEnums($walking[$last], $enums);

            unset($walking[$last]);
        });

    }

    /**
     * @param $tree
     * @param $enums Enums
     *
     */
    public function canRemoveEnums($tree, $enums)
    {
        foreach ($tree['childs'] as $value) {
            if (isset($value['childs'])) {
                $this->canRemoveEnums($value, $enums);
            } else {
                $enum = $enums->getEnum($value['idNode']);
                if(!$enum->canBeDeleted())
                    throw new EnumCantBeRemovedIsRefException($enum->getId(), $enum->getName(), $enum->getCanBeDeletedMessage());

            }
        }
    }

    public function removeEnums($tree, $enums)
    {
        $actionsM = ActionManager::getInstance($this->enumInstance);
        foreach ($tree['childs'] as $value) {
            if (isset($value['childs'])) {
                $this->removeEnums($value, $enums);
            } else {
                $refs = Refs::getInstance($this->enumInstance);

                $_enum = $enums->getEnum($value['idNode']);
                $actionsM->callPreEnumRemActions($_enum->enumInstance, $_enum);
                $refs->deleteReferencesFrom($_enum);

                $conn = EnumsUtils::getDBConnection($_enum);
                $conn->removeTable($_enum->getId(), $_enum->getDataSource()->getSchema());
                $enums->delEnum($_enum);
                $actionsM->callPostEnumRemActions($_enum->enumInstance, $_enum);

            }
        }

    }

    public function removeTreeNode($path)
    {
        $this->walk($path, function ($last, &$walking) {
            unset($walking[$last]);
        });
    }

    public function removeEnumsInArray($enumArray)
    {
        $this->walkAllNodes($this->simpleTree, function (&$child) use ($enumArray) {
            if (isset($child['childs'])) {
                foreach ($enumArray as $value) {
                    if (isset($child['childs'][$value]) && !isset($child['childs'][$value]['childs'])) {
                        unset($child['childs'][$value]);
                    }
                }
            }
        });
    }

    public static function removeFromSimpleTree(&$item, $key, $enumArray)
    {
        unset($item);

    }

    public function removeAll()
    {
        unlink(self::getSimpleTreePath());

    }

    public static function moveNode($enumInstance, $previousPath, $point, $newPath, $targetPos)
    {
        $simpleT = SimpleTree::getInstance($enumInstance);

        $nodeToMove = null;
        $simpleT->walk($previousPath, function ($last, $walking) use (&$nodeToMove) {
            $nodeToMove = $walking[$last];
        });

        $simpleT->removeTreeNode($previousPath);
        $newPath = explode('/', $newPath);
        array_splice($newPath, 0, 2);
        $targetPos = explode('/', $targetPos);
        $targetPos = $targetPos[count($targetPos) - 1];
        $tree = self::setNode($simpleT->simpleTree['childs'], $newPath, $targetPos, $point, $nodeToMove);
        $simpleT->simpleTree['childs'] = $tree;
        $simpleT->saveSimpleTree($enumInstance);

    }

    public static function setNode($currentTree, $newPathExploded, $targetPosLastWord, $point, $nodeToMove)
    {
        if (count($newPathExploded) == 1) {
            $tree = array();
            foreach ($currentTree as $key => $value) {
                if ($key == $targetPosLastWord) {
                    if ($point == 'above') {
                        $tree[$newPathExploded[0]] = $nodeToMove;
                        $tree[$key] = $value;
                    } else if ($point == 'below') {
                        $tree[$key] = $value;
                        $tree[$newPathExploded[0]] = $nodeToMove;
                    }
                } else {
                    $tree [$key] = $value;
                }
            }
            return $tree;
        } else {
            $tree = $currentTree;
            $word = $newPathExploded[0];
            array_splice($newPathExploded, 0, 1);
            if (count($newPathExploded) == 1 && $point == 'append') {
                $tree[$word]['childs'][$newPathExploded[0]] = $nodeToMove;
            } else {
                $tree[$word]['childs'] = self::setNode($currentTree[$word]['childs'], $newPathExploded,
                    $targetPosLastWord, $point, $nodeToMove);
            }
            return $tree;
        }
    }

    public static function getPathToExportItem()
    {
        $simpleTree = SimpleTree::getInstance();
        $pathToItem = EnumsUtils::getTempPath() . '/simpleTree.json';
        file_put_contents($pathToItem, json_encode($simpleTree->simpleTree['childs']));
        return $pathToItem;
    }

}