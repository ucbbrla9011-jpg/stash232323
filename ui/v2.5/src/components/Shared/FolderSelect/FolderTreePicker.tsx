import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "react-bootstrap";
import { LoadingIndicator } from "src/components/Shared/LoadingIndicator";
import TextUtils from "src/utils/text";
import { FormattedMessage } from "react-intl";
import { useDirectoryPaths } from "./useDirectoryPaths";

interface IFolderTreePickerProps {
  currentDirectory: string;
  onSelectDirectory: (value: string) => void;
  defaultDirectories?: string[];
  hideError?: boolean;
}

interface ITreeNodeProps {
  path: string;
  depth: number;
  parentPath?: string;
  expandedPaths: Set<string>;
  focusedPath: string | null;
  hideError: boolean;
  onSelect: (value: string) => void;
  onFocusPath: (value: string) => void;
  onToggleExpand: (path: string, expand?: boolean) => void;
}

const TreeNode: React.FC<ITreeNodeProps> = ({
  path,
  depth,
  parentPath,
  expandedPaths,
  focusedPath,
  hideError,
  onSelect,
  onFocusPath,
  onToggleExpand,
}) => {
  const { directories, loading } = useDirectoryPaths(path, hideError);
  const children = directories ?? [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedPaths.has(path);
  const isSelected = focusedPath === path;

  const label = TextUtils.fileNameFromPath(path);
  const displayLabel = label.length > 0 ? label : path;

  return (
    <li
      className="folder-tree-item"
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
    >
      <div className="folder-tree-row" style={{ paddingLeft: `${depth}rem` }}>
        <Button
          variant="link"
          className="folder-tree-toggle"
          onClick={() => onToggleExpand(path)}
          disabled={!hasChildren}
          tabIndex={-1}
          aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
        >
          {hasChildren ? (isExpanded ? "▾" : "▸") : ""}
        </Button>
        <Button
          variant="link"
          className={`folder-tree-button${
            isSelected ? " is-selected" : ""
          }`}
          data-tree-item="true"
          data-path={path}
          data-parent={parentPath}
          data-has-children={hasChildren}
          data-expanded={isExpanded}
          onClick={() => {
            onSelect(path);
          }}
          onFocus={() => onFocusPath(path)}
          tabIndex={isSelected ? 0 : -1}
          title={path}
        >
          <span className="folder-tree-label">{displayLabel}</span>
          {loading && <LoadingIndicator inline small message="" />}
        </Button>
      </div>
      {isExpanded && hasChildren && (
        <ul className="folder-tree-group" role="group">
          {children.map((child) => (
            <TreeNode
              key={child}
              path={child}
              depth={depth + 1}
              parentPath={path}
              expandedPaths={expandedPaths}
              focusedPath={focusedPath}
              hideError={hideError}
              onSelect={onSelect}
              onFocusPath={onFocusPath}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export const FolderTreePicker: React.FC<IFolderTreePickerProps> = ({
  currentDirectory,
  onSelectDirectory,
  defaultDirectories = [],
  hideError = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [focusedPath, setFocusedPath] = useState<string | null>(null);
  const { directories: baseDirectories, parent } = useDirectoryPaths(
    currentDirectory,
    hideError
  );

  const rootDirectories = useMemo(() => {
    if (defaultDirectories.length > 0) {
      return defaultDirectories;
    }

    if (currentDirectory) {
      return [currentDirectory];
    }

    return baseDirectories ?? [];
  }, [baseDirectories, currentDirectory, defaultDirectories]);

  useEffect(() => {
    if (!currentDirectory) return;
    setExpandedPaths((prev) => {
      if (prev.has(currentDirectory)) return prev;
      const next = new Set(prev);
      next.add(currentDirectory);
      return next;
    });
  }, [currentDirectory]);

  const updateExpandedPaths = (path: string, expand?: boolean) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      const shouldExpand = expand ?? !next.has(path);
      if (shouldExpand) {
        next.add(path);
      } else {
        next.delete(path);
      }
      return next;
    });
  };

  const focusPath = (path: string) => {
    const container = containerRef.current;
    if (!container) return false;
    const items = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        "[data-tree-item='true']"
      )
    );
    const target = items.find((item) => item.dataset.path === path);
    if (target) {
      target.focus();
      setFocusedPath(path);
      return true;
    }
    return false;
  };

  const focusIndex = (index: number) => {
    const container = containerRef.current;
    if (!container) return;
    const items = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        "[data-tree-item='true']"
      )
    );
    if (index < 0 || index >= items.length) return;
    items[index].focus();
    setFocusedPath(items[index].dataset.path ?? null);
  };

  useEffect(() => {
    if (currentDirectory && focusPath(currentDirectory)) {
      return;
    }

    if (rootDirectories.length > 0) {
      focusPath(rootDirectories[0]);
    }
  }, [currentDirectory, rootDirectories]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (
      ![
        "ArrowDown",
        "ArrowUp",
        "ArrowLeft",
        "ArrowRight",
        "Enter",
      ].includes(event.key)
    ) {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const items = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        "[data-tree-item='true']"
      )
    );
    if (items.length === 0) return;

    const activeElement = document.activeElement as HTMLButtonElement | null;
    const activeIndex = items.findIndex((item) => item === activeElement);
    const activeItem = activeIndex >= 0 ? items[activeIndex] : items[0];

    if (!activeItem) return;

    const activePath = activeItem.dataset.path ?? "";
    const parentPath = activeItem.dataset.parent;
    const hasChildren = activeItem.dataset.hasChildren === "true";
    const isExpanded = activeItem.dataset.expanded === "true";

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusIndex(activeIndex + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusIndex(activeIndex - 1);
        break;
      case "ArrowRight":
        event.preventDefault();
        if (hasChildren && !isExpanded) {
          updateExpandedPaths(activePath, true);
        } else if (hasChildren && isExpanded) {
          const firstChild = items.find(
            (item) => item.dataset.parent === activePath
          );
          if (firstChild) {
            firstChild.focus();
            setFocusedPath(firstChild.dataset.path ?? null);
          }
        }
        break;
      case "ArrowLeft":
        event.preventDefault();
        if (isExpanded) {
          updateExpandedPaths(activePath, false);
        } else if (parentPath) {
          focusPath(parentPath);
        }
        break;
      case "Enter":
        event.preventDefault();
        onSelectDirectory(activePath);
        break;
      default:
        break;
    }
  };

  return (
    <div
      className="folder-tree-container"
      ref={containerRef}
      role="tree"
      onKeyDown={handleKeyDown}
    >
      <ul className="folder-tree">
        {!defaultDirectories.length && parent && (
          <li className="folder-tree-item folder-tree-parent" role="treeitem">
            <div className="folder-tree-row">
              <Button
                variant="link"
                className={`folder-tree-button${
                  focusedPath === parent ? " is-selected" : ""
                }`}
                data-tree-item="true"
                data-path={parent}
                data-has-children="false"
                data-expanded="false"
                onClick={() => {
                  onSelectDirectory(parent);
                  setFocusedPath(parent);
                }}
                onFocus={() => setFocusedPath(parent)}
                tabIndex={focusedPath === parent ? 0 : -1}
              >
                <span className="folder-tree-parent-label">
                  <FormattedMessage id="setup.folder.up_dir" />
                </span>
              </Button>
            </div>
          </li>
        )}
        {rootDirectories.map((dir) => (
          <TreeNode
            key={dir}
            path={dir}
            depth={0}
            expandedPaths={expandedPaths}
            focusedPath={focusedPath}
            hideError={hideError}
            onSelect={(value) => {
              onSelectDirectory(value);
              setFocusedPath(value);
            }}
            onFocusPath={setFocusedPath}
            onToggleExpand={updateExpandedPaths}
          />
        ))}
      </ul>
    </div>
  );
};
