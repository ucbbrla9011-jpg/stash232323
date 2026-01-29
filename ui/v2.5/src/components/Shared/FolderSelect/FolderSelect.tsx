import React, { useState } from "react";
import { useIntl } from "react-intl";
import { Button, InputGroup, Form, Collapse } from "react-bootstrap";
import { Icon } from "../Icon";
import { LoadingIndicator } from "../LoadingIndicator";
import { faEllipsis, faTimes } from "@fortawesome/free-solid-svg-icons";
import { useDebounce } from "src/hooks/debounce";
import TextUtils from "src/utils/text";
import { useDirectoryPaths } from "./useDirectoryPaths";
import { PatchComponent } from "src/patch";
import { FolderTreePicker } from "./FolderTreePicker";

interface IProps {
  currentDirectory: string;
  onChangeDirectory: (value: string) => void;
  defaultDirectories?: string[];
  appendButton?: JSX.Element;
  collapsible?: boolean;
  quotePath?: boolean;
  hideError?: boolean;
}

const _FolderSelect: React.FC<IProps> = ({
  currentDirectory,
  onChangeDirectory,
  defaultDirectories = [],
  appendButton,
  collapsible = false,
  quotePath = false,
  hideError = false,
}) => {
  const intl = useIntl();
  const [showBrowser, setShowBrowser] = useState(false);
  const [path, setPath] = useState(currentDirectory);

  const normalizedPath = quotePath ? TextUtils.stripQuotes(path) : path;
  const { error, loading } = useDirectoryPaths(normalizedPath, hideError);

  const debouncedSetDirectory = useDebounce(setPath, 250);

  function setInstant(value: string) {
    const normalizedValue =
      quotePath && value.includes(" ") ? TextUtils.addQuotes(value) : value;
    onChangeDirectory(normalizedValue);
    setPath(normalizedValue);
  }

  function setDebounced(value: string) {
    onChangeDirectory(value);
    debouncedSetDirectory(value);
  }

  return (
    <>
      <InputGroup>
        <Form.Control
          className="btn-secondary"
          placeholder={intl.formatMessage({ id: "setup.folder.file_path" })}
          onChange={(e) => {
            setDebounced(e.currentTarget.value);
          }}
          value={currentDirectory}
          spellCheck={false}
        />

        {appendButton && <InputGroup.Append>{appendButton}</InputGroup.Append>}

        {collapsible && (
          <InputGroup.Append>
            <Button
              variant="secondary"
              onClick={() => setShowBrowser(!showBrowser)}
            >
              <Icon icon={faEllipsis} />
            </Button>
          </InputGroup.Append>
        )}

        {(loading || error) && (
          <InputGroup.Append className="align-self-center">
            {loading ? (
              <LoadingIndicator inline small message="" />
            ) : (
              !hideError && <Icon icon={faTimes} color="red" className="ml-3" />
            )}
          </InputGroup.Append>
        )}
      </InputGroup>

      {!hideError && error !== undefined && (
        <h5 className="mt-4 text-break">Error: {error.message}</h5>
      )}

      <Collapse in={!collapsible || showBrowser}>
        <FolderTreePicker
          currentDirectory={normalizedPath}
          defaultDirectories={defaultDirectories}
          hideError={hideError}
          onSelectDirectory={(value) => setInstant(value)}
        />
      </Collapse>
    </>
  );
};

export const FolderSelect = PatchComponent("FolderSelect", _FolderSelect);
