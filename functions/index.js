const functions = require("firebase-functions");
const admin = require("firebase-admin")

admin.initializeApp();

const data = [
    {
        "title": "Body Lotion - Fitness extreme",
        "description": "This is a product description",
        "media": "assets/samples/1.png",
        "mediaType": "MediaTypeEnum.image",
    },
    {
        "title": "Product 2",
        "description": "This is a product description",
        "media": "assets/samples/2.png",
        "mediaType": "MediaTypeEnum.image",
    },
    {
        "title": "Product 3",
        "description": "This is a product description",
        "media": "assets/samples/3.png",
        "mediaType": "MediaTypeEnum.image",
    },
    // {
    //     "title": "Product 3",
    //     "description": "This is a product description",
    //     "media": "assets/samples/4.mp4",
    //     "mediaType": "MediaTypeEnum.video",
    // },
];

// if (process.env.FUNCTIONS_EMULATOR !== "true") {
    exports.populate = functions.https.onRequest(async (request, response) => {
        console.log(process.env.FUNCTIONS_EMULATOR);
        for (let i = 0; i < data.length; i++) {
            data[i].createdAt = admin.firestore.FieldValue.serverTimestamp();

            await admin.firestore().collection("products").add(data[i]);
        }

        response.send("Hello from Firebase!");
    });
// }

exports.onUploadProductFile = functions.storage.object().onFinalize(async (object) => { 
    const fileBucket = object.bucket;
    const filePath = object.name;
    const contentType = object.contentType;

    console.log({
        fileBucket,
        filePath,
        contentType,
    });

    let mediaType = "MediaTypeEnum.video";

    if(contentType.startsWith("image/")) {
        mediaType = "MediaTypeEnum.image";
    }

    const productsRef = await admin.firestore().collection("products").where("media", "==", filePath).get();

    if(productsRef.empty) {
        return;
    }

    const productRef = productsRef.docs[0];

    const createdAt = admin.firestore.FieldValue.serverTimestamp();

    await productRef.ref.update({
        mediaType,
        createdAt,
        updatedAt: createdAt,
    });
});

exports.onFavoriteCreated = functions.firestore.document("users/{userId}/favorites/{favoriteId}").onCreate(async (snapshot, context) => {
    const {userId, favoriteId} = context.params;

    const favoriteRef = admin
        .firestore()
        .collection("users")
        .doc(userId)
        .collection("favorites")
        .doc(favoriteId);

    const favorite = await favoriteRef.get();

    await favorite.ref.update({
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    const { productRef } = favorite.data();

    await productRef.update({
        favoritesCount: admin.firestore.FieldValue.increment(1),
    });
})

exports.onFavoriteDeleted = functions.firestore.document("users/{userId}/favorites/{favoriteId}").onDelete(async (snapshot) => {
    const { productRef } = snapshot.data(); 

    await productRef.update({
        favoritesCount: admin.firestore.FieldValue.increment(-1)
    });
})