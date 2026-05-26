# teachable-machine-example

Project created with assistance from Google Gemini.

[Link to conversation](https://gemini.google.com/share/e914200b31dd)

## Design Decisions and Program Documentation
1. The style is modelled after the [Westminster High School website](https://whslions.net), and styled using Bootstrap
2. To allow for users to upload their own model, the program has a zip file upload.

## Limitations and Future Development
1. The user must upload a zip file that contains three specific files named in a specific way: model.json, metadata.json, weights.bin.  We are considering allowing users to upload a Keras model (.h5 file extension) for use in Python environments.