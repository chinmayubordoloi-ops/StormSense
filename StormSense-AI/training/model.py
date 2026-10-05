import torch
import torch.nn as nn


class StormSenseModel(nn.Module):

    def __init__(self, input_features=7, output_hours=5):
        super().__init__()

        # Spatial feature extraction
        self.spatial = nn.Sequential(
            nn.Conv3d(
                input_features,
                32,
                kernel_size=3,
                padding=1
            ),
            nn.ReLU(),

            nn.Conv3d(
                32,
                64,
                kernel_size=3,
                padding=1
            ),
            nn.ReLU()
        )

        # Temporal feature extraction
        self.temporal = nn.Conv3d(
            64,
            64,
            kernel_size=3,
            padding=1
        )

        # Output heads for 2h, 3h, 4h, 5h, 6h
        self.output = nn.Conv3d(
            64,
            output_hours,
            kernel_size=1
        )

    def forward(self, x):

        # Input:
        # batch, time, latitude, longitude, features

        # Convert to:
        # batch, features, time, latitude, longitude

        x = x.permute(0, 4, 1, 2, 3)

        x = self.spatial(x)

        x = torch.relu(
            self.temporal(x)
        )

        # Average over input time dimension
        x = x.mean(dim=2)

        # Output:
        # batch, 5, latitude, longitude

        x = self.output(
            x.unsqueeze(2)
        )

        x = x.squeeze(2)

        # Convert:
        # batch, 5, lat, lon
        #
        # to:
        # batch, lat, lon, 5

        x = x.permute(0, 2, 3, 1)

        return x


if __name__ == "__main__":

    model = StormSenseModel()

    test_input = torch.randn(
        2,
        6,
        17,
        29,
        7
    )

    output = model(test_input)

    print("Input shape:", test_input.shape)
    print("Output shape:", output.shape)
    print()
    print("Model:")
    print(model)