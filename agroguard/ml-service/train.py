"""
Training pipeline for ShetVaidya using PlantVillage dataset filtered for Tomato, Potato, Bell Pepper.
Assumes dataset layout: data/train/<class_name>/*.jpg and data/val/<class_name>/*.jpg
"""
import json
import pathlib

import tensorflow as tf
from sklearn.metrics import confusion_matrix
import numpy as np

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 25
CLASSES = [
    "bell_pepper_bacterial_spot",
    "bell_pepper_healthy",
    "potato_early_blight",
    "potato_late_blight",
    "potato_healthy",
    "tomato_early_blight",
    "tomato_late_blight",
    "tomato_leaf_mold",
    "tomato_septoria_leaf_spot",
    "tomato_spider_mites_two_spotted_spider_mite",
    "tomato_target_spot",
    "tomato_yellow_leaf_curl_virus",
    "tomato_mosaic_virus",
    "tomato_healthy",
]


def build_datasets(root: str):
    train_ds = tf.keras.preprocessing.image_dataset_from_directory(
        pathlib.Path(root) / "train",
        labels="inferred",
        label_mode="categorical",
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_names=CLASSES,
        shuffle=True,
    )
    val_ds = tf.keras.preprocessing.image_dataset_from_directory(
        pathlib.Path(root) / "val",
        labels="inferred",
        label_mode="categorical",
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_names=CLASSES,
        shuffle=False,
    )

    data_aug = tf.keras.Sequential([
        tf.keras.layers.RandomFlip("horizontal"),
        tf.keras.layers.RandomRotation(0.1),
        tf.keras.layers.RandomZoom(0.1),
    ])

    def preprocess(img, label):
        img = data_aug(img)
        return tf.keras.applications.mobilenet_v2.preprocess_input(img), label

    train_ds = train_ds.map(preprocess).cache().prefetch(tf.data.AUTOTUNE)
    val_ds = val_ds.map(preprocess).cache().prefetch(tf.data.AUTOTUNE)
    return train_ds, val_ds


def build_model(num_classes: int):
    base = tf.keras.applications.MobileNetV2(input_shape=(*IMG_SIZE, 3), include_top=False, weights="imagenet")
    base.trainable = False
    inputs = tf.keras.Input(shape=(*IMG_SIZE, 3))
    x = base(inputs, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.2)(x)
    outputs = tf.keras.layers.Dense(num_classes, activation="softmax")(x)
    model = tf.keras.Model(inputs, outputs)
    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3), loss="categorical_crossentropy", metrics=["accuracy"])
    return model


def train(data_root: str = "data"):
    train_ds, val_ds = build_datasets(data_root)
    model = build_model(len(CLASSES))
    es = tf.keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True)
    history = model.fit(train_ds, validation_data=val_ds, epochs=EPOCHS, callbacks=[es])
    val_acc = max(history.history.get("val_accuracy", [0.0]))

    # Evaluate and print confusion matrix on validation
    y_true, y_pred = [], []
    for imgs, labels in val_ds:
        preds = model.predict(imgs, verbose=0)
        y_true.extend(np.argmax(labels.numpy(), axis=1))
        y_pred.extend(np.argmax(preds, axis=1))
    cm = confusion_matrix(y_true, y_pred, labels=list(range(len(CLASSES))))
    print("Confusion matrix:\n", cm)

    pathlib.Path("artifacts").mkdir(exist_ok=True)
    np.save("artifacts/confusion_matrix.npy", cm)
    with open("artifacts/classes.json", "w", encoding="utf-8") as fp:
        json.dump(CLASSES, fp, indent=2)

    model.save("model")
    if val_acc < 0.85:
        print(f"WARNING: Validation accuracy below target (0.85). Current: {val_acc:.4f}")
    else:
        print(f"Validation target achieved: {val_acc:.4f}")
    return history


if __name__ == "__main__":
    train()
