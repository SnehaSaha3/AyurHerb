// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract CropRegistry {
    struct Crop {
        uint256 id;
        string name;
        string area;
        string season;
        string soil;
        int256 lat;
        int256 lng;
        uint256 createdAt;
        uint256 updatedAt;
        address farmer;
    }

    mapping(uint256 => Crop) public crops;
    mapping(address => uint256[]) public farmerCrops;

    uint256 public cropCount;

    event CropAdded(
        uint256 indexed cropId,
        address indexed farmer,
        string name
    );

    event CropUpdated(
        uint256 indexed cropId,
        address indexed farmer,
        string name
    );

    // -------------------------------------------------------------
    // ADD CROP
    // -------------------------------------------------------------

    function addCrop(
        address _farmerAddr,
        string memory _name,
        string memory _area,
        string memory _season,
        string memory _soil,
        int256 _lat,
        int256 _lng
    ) public returns (uint256 cropId) {
        require(_farmerAddr != address(0), "Invalid farmer address");

        cropId = cropCount;

        crops[cropId] = Crop({
            id: cropId,
            name: _name,
            area: _area,
            season: _season,
            soil: _soil,
            lat: _lat,
            lng: _lng,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            farmer: _farmerAddr
        });

        farmerCrops[_farmerAddr].push(cropId);

        cropCount++;

        emit CropAdded(
            cropId,
            _farmerAddr,
            _name
        );

        return cropId;
    }

    // -------------------------------------------------------------
    // UPDATE CROP
    // -------------------------------------------------------------

    function updateCrop(
        uint256 _cropId,
        address _farmerAddr,
        string memory _name,
        string memory _area,
        string memory _season,
        string memory _soil,
        int256 _lat,
        int256 _lng
    ) public {
        require(_cropId < cropCount, "Crop does not exist");
        require(_farmerAddr != address(0), "Invalid farmer address");

        Crop storage crop = crops[_cropId];

        require(
            crop.farmer == _farmerAddr,
            "Farmer does not own this crop"
        );

        crop.name = _name;
        crop.area = _area;
        crop.season = _season;
        crop.soil = _soil;
        crop.lat = _lat;
        crop.lng = _lng;
        crop.updatedAt = block.timestamp;

        emit CropUpdated(
            _cropId,
            _farmerAddr,
            _name
        );
    }

    // -------------------------------------------------------------
    // GET FARMER CROPS
    // -------------------------------------------------------------

    function getCropsByFarmer(
        address _farmer
    ) public view returns (Crop[] memory) {

        uint256[] memory ids = farmerCrops[_farmer];

        Crop[] memory list = new Crop[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            list[i] = crops[ids[i]];
        }

        return list;
    }

    // -------------------------------------------------------------
    // GET SINGLE CROP
    // -------------------------------------------------------------

    function getCrop(
        uint256 _cropId
    ) public view returns (Crop memory) {

        require(
            _cropId < cropCount,
            "Crop does not exist"
        );

        return crops[_cropId];
    }

    // -------------------------------------------------------------
    // GET ALL CROPS
    // -------------------------------------------------------------

    function getAllCrops()
        public
        view
        returns (Crop[] memory)
    {
        Crop[] memory list = new Crop[](cropCount);

        for (uint256 i = 0; i < cropCount; i++) {
            list[i] = crops[i];
        }

        return list;
    }
}