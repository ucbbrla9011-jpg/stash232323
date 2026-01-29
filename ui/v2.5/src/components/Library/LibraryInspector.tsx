import React, { useMemo, useState } from "react";
import { Tab, Tabs } from "react-bootstrap";
import { useIntl } from "react-intl";
import { useToast } from "src/hooks/Toast";
import { ErrorMessage } from "src/components/Shared/ErrorMessage";
import { LoadingIndicator } from "src/components/Shared/LoadingIndicator";
import {
  useFindImage,
  useImageUpdate,
} from "src/core/StashService";
import * as GQL from "src/core/generated-graphql";
import { ImageDetailPanel } from "src/components/Images/ImageDetails/ImageDetailPanel";
import { ImageEditPanel } from "src/components/Images/ImageDetails/ImageEditPanel";
import { ImageFileInfoPanel } from "src/components/Images/ImageDetails/ImageFileInfoPanel";
import { DeleteImagesDialog } from "src/components/Images/DeleteImagesDialog";

interface LibraryInspectorProps {
  imageId: string;
}

export const LibraryInspector: React.FC<LibraryInspectorProps> = ({
  imageId,
}) => {
  const intl = useIntl();
  const Toast = useToast();
  const { data, loading, error } = useFindImage(imageId);
  const [updateImage] = useImageUpdate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const image = data?.findImage ?? undefined;

  const imageTitle = useMemo(() => {
    if (!image) {
      return "";
    }
    return image.title ?? image.id;
  }, [image]);

  async function onSave(input: GQL.ImageUpdateInput) {
    await updateImage({ variables: { input } });
    Toast.success(
      intl.formatMessage(
        { id: "toast.updated_entity" },
        { entity: intl.formatMessage({ id: "image" }).toLocaleLowerCase() }
      )
    );
  }

  function maybeRenderDeleteDialog() {
    if (!image || !deleteDialogOpen) {
      return null;
    }
    return (
      <DeleteImagesDialog
        selected={[image]}
        onClose={() => setDeleteDialogOpen(false)}
      />
    );
  }

  if (loading) {
    return <LoadingIndicator />;
  }

  if (error) {
    return (
      <ErrorMessage
        message={intl.formatMessage({ id: "errors.loading_type" }, { type: "image" })}
        error={error.message}
      />
    );
  }

  if (!image) {
    return null;
  }

  return (
    <div className="library-inspector">
      {maybeRenderDeleteDialog()}
      <h4 className="library-inspector-title">{imageTitle}</h4>
      <Tabs
        activeKey={activeTab}
        onSelect={(key) => setActiveTab(key ?? "details")}
        className="library-inspector-tabs"
      >
        <Tab eventKey="details" title={intl.formatMessage({ id: "details" })}>
          <div className="library-inspector-section">
            <ImageDetailPanel image={image} />
          </div>
          <div className="library-inspector-section">
            <ImageFileInfoPanel image={image} />
          </div>
        </Tab>
        <Tab eventKey="edit" title={intl.formatMessage({ id: "actions.edit" })}>
          <div className="library-inspector-section">
            <ImageEditPanel
              image={image}
              isVisible={activeTab === "edit"}
              onSubmit={onSave}
              onDelete={() => setDeleteDialogOpen(true)}
            />
          </div>
        </Tab>
      </Tabs>
    </div>
  );
};
